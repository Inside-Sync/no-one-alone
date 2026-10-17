# No One Alone prototype: implementation spec (Noa chat, discharge, phone, simulator)

Source: designer prototype `artifact-d9f256dc-1792220274-cdc6.html` (title "No One Alone Platform"). Read-only extraction. Line refs are to a copy with base64 data URIs stripped. The prototype is a single file built in "parts" that monkey-patch earlier functions (`render`, `drawSim`, `tick`, `addBoardRow`, `buildRecovery`, `chatDraw`). Later parts win. This spec describes the final effective behaviour.

## 0. Summary: what differs most from a typical dashboard

1. A conversational agent ("Noa") is the main actor: a slide-in chat panel plus "Ask Noa" buttons injected into several cards, answering from live app state with regex rules (no LLM).
2. Answers and chips change by audience: hospital (clinical, audit-logged), Margaret herself ("you"), or a family viewer ("Mum"/"Margaret"), and respect per-viewer sharing ("Who sees what") with lock messages.
3. A live simulator replaces a static alert replay: heart-rate and "not moving" sliders drive a rule (HR > 120 for 10 min while still) that auto-starts a scripted green/amber/red dialogue.
4. A voice "Speech Check" ("The sky is blue in Sydney") compared to Margaret's own baseline, with a 5-measure table, decides the red branch.
5. A phone mock ("Margaret's phone/screen") mirrors what Noa says in large text, with "I'm OK" / "Help me" buttons and reply buttons that change the story.
6. A full 000 call script, pre-arrival FHIR packet to Camperdown Stroke Centre, and "Who got what" handover cards, each person receiving only what they need.
7. Hospital side has a 3-step discharge flow (Review, Finalise by Dr Ross, Approve) that hands off to Noa, which then talks to Margaret and builds her recovery portal.
8. The recovery portal is patient-facing plain English: schedule of tablets/tasks, reminders drawer, appointments, warning signs, check-in call days.
9. A day/night theme: `body.night` switches the scene background image and phone colours during an alert.
10. Everything is glassmorphism cards over a full-bleed illustrated `.scene` background, with an animated orb as Noa's identity instead of a robot emoji.

---

## 1. Noa chat

### 1.1 Markup (injected at runtime, `aside#chat.chat`)

```html
<aside id="chat" class="chat" aria-label="Chat with the No One Alone agent">
  <header>
    <span class="chat-orb" id="chatOrb"><!-- orb(48) SVG --></span>   <!-- replaces <span class="chat-logo">🤖</span> -->
    <div><b>Noa</b><small id="chatSub">Live · knows Margaret's day</small></div>
    <button id="chatX" class="rb" aria-label="Close chat">✕</button>
  </header>
  <div class="chat-msgs" id="chatMsgs" aria-live="polite"></div>
  <div class="chat-chips" id="chatChips"></div>
  <form id="chatF" autocomplete="off">
    <input id="chatIn" placeholder="Ask about Margaret…" aria-label="Your question">
    <button class="btn sm" type="submit">Send</button>
  </form>
</aside>
<button id="chatFab" class="chat-fab" data-chat="1"><!-- orb(40) --><span>Ask Noa</span><i></i></button>
```

Original FAB text before the orb patch was `<span>🤖</span><span>Ask the agent</span><i></i>`; final is orb + "Ask Noa".

`#chatSub` text is rewritten on every draw:
- hospital: `Clinical mode · audit-logged`
- self: `Noa · private to you`
- family/community: `Live · {viewerName}'s view · follows Margaret's sharing`
(The initial "Live · knows Margaret's day" is only seen before the first open.)

Each agent message gets an avatar label inserted before it: `<span class="cav"><i class="om" style="--s:22px"></i><b>Noa</b></span>`.

### 1.2 CSS

```css
.chat{position:fixed;top:16px;right:16px;bottom:16px;z-index:58;width:410px;max-width:calc(100vw - 32px);border-radius:24px;display:flex;flex-direction:column;overflow:hidden;color:#0d2a2a;
  background:linear-gradient(180deg,rgba(255,255,255,.93),rgba(232,247,243,.9));backdrop-filter:blur(30px) saturate(1.8);
  box-shadow:inset 0 1px 0 #fff,0 20px 60px rgba(4,30,28,.35);transform:translateX(110%);visibility:hidden;
  transition:transform .32s cubic-bezier(.22,.8,.24,1),visibility 0s linear .32s;
  --ink:#0d2a2a;--ink2:#2f4c4b;--muted:#56706e;--line:rgba(13,42,42,.1);--glass-2:rgba(255,255,255,.72)}
.chat.on{transform:none;visibility:visible;transition:transform .32s cubic-bezier(.22,.8,.24,1)}
.chat header{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line)}
.chat header b{display:block;font-size:15px}.chat header small{font-size:11.5px;color:var(--muted)}
.chat-orb{display:grid;place-items:center}
.chat-msgs{flex:1;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.cm{max-width:88%;padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.5;background:#fff;box-shadow:0 1px 0 rgba(13,42,42,.06),inset 0 0 0 1px rgba(13,42,42,.06);border-bottom-left-radius:5px}
.cm.me{align-self:flex-end;background:linear-gradient(160deg,#0b7f71,#139a86);color:#fff;border-bottom-left-radius:16px;border-bottom-right-radius:5px}
.cm .btn{margin-top:6px}.cm .fine{font-size:12px}
.cm.typing{display:flex;gap:4px;padding:13px}.cm.typing i{width:7px;height:7px;border-radius:50%;background:#7aa39d;animation:blink7 1s infinite}
.cm.typing i:nth-child(2){animation-delay:.15s}.cm.typing i:nth-child(3){animation-delay:.3s}
@keyframes blink7{50%{opacity:.25}}
.cav{display:flex;align-items:center;gap:8px;padding-left:5px;font-size:10.5px;font-weight:700;color:#56706e;font-family:var(--mono);margin-bottom:-4px}
.chat-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 16px}.chat-chips .chip{font-size:12px}
#chatF{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:12px 16px 16px;border-top:1px solid var(--line)}
#chatF input{font:inherit;font-size:14px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:#fff;color:#0d2a2a}
.chat-fab{position:fixed;right:20px;bottom:20px;z-index:57;display:flex;align-items:center;gap:8px;padding:8px 18px 8px 10px;border-radius:999px;border:0;cursor:pointer;color:#fff;font:inherit;font-weight:600;font-size:14px;
  background:linear-gradient(160deg,#0b7f71,#17a58f);box-shadow:0 12px 30px rgba(8,80,70,.35),inset 0 1px 0 rgba(255,255,255,.35)}
.chat-fab .orbw svg{filter:drop-shadow(0 0 6px rgba(127,255,212,.5))}
.chat-fab>i{width:9px;height:9px;border-radius:50%;background:#7fffd4;animation:live7 1.8s infinite}   /* live dot */
@keyframes live7{70%{box-shadow:0 0 0 9px rgba(127,255,212,0)}100%{box-shadow:0 0 0 0 rgba(127,255,212,0)}}
.chat-fab.hide{opacity:0;pointer-events:none}
@media (max-width:600px){.chat-fab>span:nth-child(2){display:none}}   /* mobile: orb-only FAB */
@media (prefers-reduced-motion:reduce){.chat-fab i,.cm.typing i,.orbw svg,.orbw svg .halo,.orbw .rip{animation:none!important}}
```

Shared primitives: `.chip{display:inline-flex;gap:6px;font-size:12px;font-weight:500;padding:5px 10px;border-radius:12px;background:var(--glass-2);box-shadow:var(--glass-edge)}`, `.btn{padding:9px 14px;border-radius:12px;font-size:13.5px;font-weight:500;background:var(--brand);color:#fff}`, `.btn.soft{background:rgba(255,255,255,.7);color:#0d2a2a}`, `.btn.sm{padding:6px 10px;font-size:12.5px;border-radius:10px}`, `.btn.sos{background:var(--sos)}`. Tokens: `--brand:#0b7f71; --brand-2:#1fb39c; --sos:#ef4e4a; --good:#1f8f5f; --warn:#b97f04; --bad:#d9443f`. Hospital view overrides `--brand:#2563a8;--brand-2:#4f8fd6`; community `--brand:#6d4fc0;--brand-2:#9a7fe0`. Fonts: Be Vietnam Pro (300-700), JetBrains Mono (`--mono`).

Mobile layout: panel keeps `top/right/bottom:16px`, width capped by `max-width:calc(100vw - 32px)` (near full-screen sheet). FAB collapses to the orb only under 600px.

### 1.3 Orb (Noa identity)

`orb(size)` returns `<span class="orbw" style="--s:{size}px"><i class="rip"></i><i class="rip r2"></i><svg viewBox="0 0 48 48">` with: radial gradient sphere r=15 (stops `#eafff9` 0, `#8ff0d8` .22, `#1fb39c` .55, `#075a50` 1), halo circle r=21 (`#7fffd4` 0 to .45 opacity), tilted ring ellipse rx22 ry6.5 rotate(-18) stroke `rgba(255,255,255,.4)`, clipped latitude ellipses and 3 animated meridians (rx 15→0→15, 4s), specular highlight, front ring arc and a white satellite dot (r 2.7, stroke `#1fb39c`) on `animateMotion` 6s. Unique gradient ids per instance (`o{N}g`).

```css
.orbw{position:relative;display:inline-grid;place-items:center;width:var(--s);height:var(--s);flex:none}
.orbw svg{position:relative;z-index:1;overflow:visible;filter:drop-shadow(0 4px 8px rgba(8,90,80,.35));animation:float8 5s ease-in-out infinite}
.orbw svg .halo{animation:halo8 4s ease-in-out infinite;transform-origin:24px 24px}
.orbw .rip{position:absolute;inset:14%;border-radius:50%;border:1.5px solid rgba(31,179,156,.55);opacity:0}
.orbw.talk .rip{animation:rip8 1.6s ease-out infinite}.orbw.talk .rip.r2{animation-delay:.8s}.orbw.talk svg .halo{animation-duration:1.2s}
.orbw.alert svg{filter:hue-rotate(185deg) saturate(1.6) drop-shadow(0 4px 10px rgba(220,60,50,.45))}.orbw.alert .rip{border-color:rgba(239,78,74,.6)}
@keyframes float8{50%{transform:translateY(-2px)}} @keyframes halo8{50%{transform:scale(1.08);opacity:.7}} @keyframes rip8{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.9);opacity:0}}
.om{display:inline-block;position:relative;width:var(--s);height:var(--s);border-radius:50%;vertical-align:-3px;background:radial-gradient(circle at 34% 28%,#effffa 0 7%,#8ff0d8 24%,#1fb39c 55%,#075a50 100%);box-shadow:0 0 0 1.5px rgba(255,255,255,.75),0 2px 6px rgba(8,90,80,.3)}
.om::after{content:"";position:absolute;inset:-22%;border-radius:50%;border:1.2px solid rgba(31,179,156,.55);transform:scaleY(.36) rotate(-16deg)}
```

`mini(size)` = `<i class="om" style="--s:{size}px">`, used wherever 🤖 was (transcript "Noa →", hchat "who" labels, headings containing 🤖, Speech Check heading).

Orb moods: chat header orb gets `.talk` while the last message is "typing". Agent-card orb (`#agentOrb`, 40px) gets `.talk` while a run is active and `.alert` on red. FAB orb gets `.alert` while active. On the sim phone, `<span class="ph-orb">{mini(26)}<b>Noa</b></span>` is inserted before `.dev-q` (`.ph-orb{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;opacity:.85}`).

### 1.4 Where "Ask Noa" / chat openers are

Any element with `[data-chat]` opens the chat.
- `#chatFab` floating button "Ask Noa".
- Simulator agent card header (`#agentState` parent): `<button class="btn sm soft" data-chat="1" style="margin-left:8px">💬 Ask Noa</button>`. Its h2 becomes `{orb(40)} Noa <small class="orbsub">your No One Alone agent</small>` (`.orbh{display:flex;align-items:center;gap:8px}`, `.orbsub{font-size:12px;font-weight:500;color:var(--muted)}`).
- Hand-off drawer (after hospital approval): `💬 Ask Noa` next to `👵 Open Margaret's portal`.
- Recovery page card "What Noa told Margaret" / "From Noa": `<button class="btn sm soft" data-chat="1">Ask Noa</button>`.

### 1.5 Open/close behaviour

- `chatOpen()`: key = `cmode()+cviewer()`. If the key changed since last open, reset messages to `[greet()]` and, if a run is active, append `status()`. Add `.on` to `#chat`, `.hide` to `#chatFab`, redraw, focus `#chatIn` after 250 ms.
- `chatClose()`: remove `.on`, remove `.hide`. Triggers: `#chatX`, Escape key, clicking any answer button with `[data-chatgo]` (the `goBtn` nav buttons also navigate via `data-go`).
- `ask(q)`: ignore blank; push `['me', escaped q]`, push typing bubble `<i></i><i></i><i></i>`, after 650 ms (50 ms reduced motion) replace with `['ag', answer(q)]`. Chips have `data-ask` and call `ask(text)`. Form submit clears input and asks.
- If chat is open and the page re-renders into a different mode/viewer, it re-opens (new greeting).
- Modes: `cmode()` = `hosp` if view is hospital; `self` if who=self and view individual; else `fam`. `cviewer()` = `priya` in community view, else selected viewer (default `james`). In `fam` mode `can(cat)` checks `sees(viewer,cat)`.
- Pronoun helpers: `she()` = "you" (self) / "Mum" (fam viewer james or sarah) / "Margaret". `Her()` = "Your"/"Mum's"/"Margaret's".
- Lock message: `🔒 Margaret hasn't shared her <b>{category lowercase}</b> with {Viewer}. You could ask her, or she can change it in “Who sees what”.`

### 1.6 Greeting

- hosp: `Noa, clinical mode, for <b>COLLINS, Margaret</b> (MRN 0048213). Access is under clinical consent and every question is logged.`
- self: `Hello Margaret 💙 It's Noa. Ask me anything: your tablets, your plan, or who can see what.`
- fam: `Hi {Viewer} 👋 I'm Noa, Margaret's No One Alone companion. I look after her day and night. Ask me anything about her. I only share what she has chosen to share with you.`

### 1.7 Chips per mode

- hosp: `Patient summary`, `Pre-arrival packet`, `Discharge medicines`, `Plan status`, `Readmission risk`
- self: `How am I doing?`, `My next reminder`, `My tablets`, `Who can see my data?`, `Remind me to walk`, `Call David`
- fam: `How is {Mum|she} right now?`, `Heart rate`, `Tablets`, `Who has been called?`, `What happens in an emergency?`, `What can I see?`. If `PLAN.sent`, insert `Recovery plan` at index 3. If phase `enroute`, prepend `Ambulance ETA?`.

### 1.8 `answer(q)` rules (t = lowercased q; first match wins)

`goBtn(page,label)` = ` <button class="btn sm soft" data-go="{page}" data-chatgo="1">{label}</button>`.

All modes:
1. `/^(hi|hello|hey|g'?day)\b/` → self: `Hello Margaret 💙 What would you like to know?`; else `Hello! Ask me anything about {the patient (hosp) | she()}.`
2. `/thank/` → `Any time 💙`

Hospital mode (`hosp`):
3. `/packet|pre.?arriv|fhir|ambulance|000/` → if hand-over to hosp exists: `Pre-arrival packet received: LKW {snap.lkw}, dysarthria on Noa Speech Check at {speechAt}, HR max {maxHR} irregular. Meds: amlodipine 5 mg, aspirin 100 mg, atorvastatin 20 mg. No anticoagulant. Allergy: penicillin.` + goBtn('ed','Open ED board'); else `No active pre-arrival for this patient. On a red event Noa sends a FHIR bundle (LKW, symptoms, vitals trend, meds, allergy, NOK) about 15 minutes before arrival.` + goBtn('sim','Run the emergency')
4. `/med|drug|apixaban|aspirin|tablet/` → `Discharge meds: ` + each `{name} {dose} ({change lowercase})` joined `, ` + `.`
5. `/plan|discharg|recover|approve|final/` → `Discharge plan status: ` + (sent: `approved and delivered to the patient portal. Agent follow-up calls are booked.` | final: `finalised by Dr Ross, waiting for approval.` | else `draft. Review, finalise, then approve to hand off to the agent.`) + goBtn('patient','Open the plan')
6. `/risk|readmi|lace/` → `30-day readmission risk 14% (LACE+ adjusted), down from 22% with agent follow-up calls, BP monitoring and a GP visit on 23 Oct.`
7. default → `COLLINS, Margaret, 78 F, MRN 0048213. Acute ischaemic stroke L MCA (M2), thrombolysed (DTN 28 min). NIHSS 6 → 1. New paroxysmal AF, CHA₂DS₂-VASc 5. mRS 1, fit for discharge. Plan: {sent|finalised|draft}.` + goBtn('patient','Open record')

Individual + community modes (are/is and you/her switch by mode; shown here for family):
8. `/emergenc|what happens|scenario|if something/` and run active → `status()`
9. same regex, idle → `If {she} is very still with a fast heart for 10 minutes, I check in first, run a quick speech test and ask how she feels. Then:<br>🟢 Fine → I calm her and re-check. Nobody is woken.<br>🟡 Unwell but talking clearly → nurse video call, then James and David.<br>🔴 Slurred speech, no answer, chest pain, weakness or a fall → James, David, then 000, and the hospital gets her record.` + goBtn('sim','Try it')
10. `/call|who.*(know|told|contact)|handed|told|james|david|sarah/` and NOT `/call (her|mum|david|james)/` → no hand-overs: `No calls tonight. In an emergency I call James first, then the nearest person (David, 450 m), then 000.`; else `So far: <b>{to}</b> ({what lowercase}), … Calls: James {state}, David {state}, 000 {state}.` (lowercased)
11. `/ambulance|000|paramedic|eta/` → enroute: `🚑 The ambulance is about {eta} minutes away. ` + (`David is with her.` | `I'm staying with her on her phone.`); para/done: `The paramedics are with {she} and taking her to Camperdown Stroke Centre. The hospital already has her record.`; 000 called and active: `000: {calls.ooo}.`; else `No ambulance needed. {SHE} is fine.`
12. `/heart|bpm|pulse|blood pressure|\bbp\b/` (needs `heart`) → during/after a run: `❤️ Live heart rate: <b>{hr} bpm</b> while {moving|still}.` + (active: ` Noa is acting: {agentState label}.`); else `❤️ Resting heart rate 68 (usual 63). Blood pressure 146/88, a bit higher than usual (132/82) over 6 weeks. Dr Patel knows and will review it.`
13. `/sleep|night|bed/` (sleep) → `😴 {SHE} slept 6 h 12 m last night and woke twice. A little less than usual.`
14. `/step|walk|activ|move|exercise/` (activity) → `🚶 3,240 steps today, about usual (3,600). She went for a walk late in the morning.` + (sent: ` Recovery plan: a 20-minute walk at 10:00 each day.`)
15. `/mood|happy|sad|lonely|feel/` (mood) → `😊 Cheerful at the 13:02 chat. Mood has been steady all week.`
16. `/remind/` (meds) → if also `/walk/`: toast `⏰ Walk reminder set for 10:00`, reply `✓ Done. I'll remind her to walk at 10:00, out loud and on the screen.`; else next untaken schedule item: `⏰ Next reminder: <b>{time}</b> · {icon} {text}. I say it out loud, flash the screen and light the pill box.` (+ self only: `<button class="btn sm" data-remind="{id}">Show it now</button>`); no plan: `⏰ Tablet reminders at 08:00 and 20:00, out loud and on the screen.`
17. `/tablet|pill|med|apixaban|aspirin|dose/` (meds) → sent: `💊 {done} of {total} tasks done today. New since hospital: {New meds}. Stopped: {Stop meds or none}.` + goBtn('recovery','Open recovery'); else `💊 Morning tablets taken at 08:31 (amlodipine, aspirin, atorvastatin). Last night's tablet was taken after a reminder.`
18. `/where|location|\bhome\b|\bout\b/` (location) → `🏠 {SHE} is at home. I only ever share “home or out”, never an address or a map.`
19. `/hospital|stroke|camperdown/` → done/para: `🏥 Camperdown Stroke Centre has {her} record and the stroke team is ready.`; sent: `🏥 {SHE} had a small stroke on 15 Oct, was treated fast at Camperdown, and is home now with a recovery plan.` + goBtn('recovery','Open recovery'); else `No hospital visits recently. The nearest stroke centre is Camperdown, 4.2 km (11 minutes).`
20. `/plan|recover|discharg/` (records) → not sent: `🌱 No recovery plan yet. When the hospital finalises and approves one, I deliver it to {her} app in plain English and set the reminders.` + goBtn('patient','See the hospital side'); sent: `🌱 Day {REC.day} of 30. Daily: tablets, a 20-minute walk, blood pressure checks, speech exercises, 1.5 L of water. No driving for a month.` + goBtn('recovery','Open recovery')
21. `/appoint|gp|doctor|patel|clinic/` (records) → sent: active follow-ups `{name} · {when}` joined `<br>` prefixed `🗓️ `; else `🗓️ Next GP visit with Dr Patel: Fri 23 Oct, 10:30 (blood pressure review). David can drive.`
22. `/condition|history|\bill\b|diagnos/` (records) → `📋 ` + conditions `{icon} {name}` joined ` · ` (CONDS: 🩺 High blood pressure, 🦻 Hearing loss, 🫘 Kidneys working a bit slower, …)
23. `/weather|\bhot\b|heat|air quality|\brain\b/` → `🌤️ Sydney today: 31°C and warm, air quality good. I've reminded her to drink water. The library cool room is open until 5 pm.`
24. `/share|privacy|see|allowed|access/` → self: `🔐 James sees {n} of 11 things, Sarah {n}, David {n}. Safety alerts always go through. You can change this any time.` + goBtn('privacy','Who sees what'); fam: `🔐 {Viewer} can see: {category names}. Margaret keeps the rest private.`
25. `/message|tell (her|mum)|send|call (her|mum)/` and not self → strips the lead-in, toast `Message sent to Margaret`, reply `✓ Sent. I'll read it to her in large text, out loud: “{msg or 'Thinking of you, Mum 💙'}”`
26. `/call (david|james|sarah)/` and self → toast `Calling {Name}…`, reply `📞 Calling {Name} now, on speaker.`
27. `/how|status|now|ok|okay|update|doing|today/` → `status()`
28. default → `I can help with: how {she} is right now, heart, sleep, steps, tablets, reminders, who was called, the hospital, the recovery plan, appointments, and who can see what.`

`status()`:
- active run: `🚨 Right now: <b>{agentState}</b>. {latest log line}<br>Calls · James: {..} · David: {..} · 000: {..}` + goBtn('sim','Watch live')
- done: `🚑 Paramedics are with {she}, going to Camperdown Stroke Centre. The hospital has her record. James, Sarah and David have been updated.`
- stood amber: `💛 {SHE} had a fast, irregular heartbeat and felt dizzy. A nurse checked her on video, {David is taking her to the clinic | a home doctor is on the way}, and her heart rate is settling.`
- stood green: `💚 All clear. {Her} heart was fast for a while, but her speech was clear and she settled after a chat. Nobody needed waking.`
- plan sent: `🌱 Home and recovering: day {d} of 30. {done} of {n} tasks done today. Next: {time} · {task}.`
- default: `🌞 {SHE} is doing well today. Up and about this morning` + (meds) `, tablets taken at 08:31` + (activity) `, a walk late in the morning` + `, and a rest this afternoon because it's warm.` + (mood) ` Cheerful at the 13:02 chat.` + (heart) ` Resting heart rate 68.` + (fam without mood) ` <span class="fine">(Margaret keeps her mood private.)</span>`

---

## 2. Discharge and recovery

### 2.1 Hospital tab and page

Hospital view gets tab `['patient','file','Patient record & discharge']`. Page title `Patient record · COLLINS, Margaret (F, 78)`, avatar `MC` `#2563a8`, sub `MRN 0048213 · Stroke unit bed 4 · admitted 15 Oct 02:24 via ambulance · day 3`, facts: Status `fit for discharge`, NIHSS `6 → 1`, Allergy `penicillin`, Consent `portal + family (per patient settings)`.

ED and Discharge pages get a top banner card (`.sendbar{border-left:4px solid var(--brand);padding:14px 18px}`): `🩺 Ready for discharge: Margaret Collins, 78` / `Ischaemic stroke, thrombolysed · new paroxysmal AF · recovery plan waiting for approval` / button `📝 Open her record and recovery plan` (data-go=patient). Family "record" page banner: `🌱 Hospital recovery plan` / `The hospital sends it here after discharge. See it in the Recovery tab.` / `Open Recovery`.

Patient page order:
1. Send bar: `🩺 Margaret Collins is fit for discharge` / `Review the plan below, then approve. The agent delivers it to Margaret's portal with reminders.` Buttons: `.sendPlanBtn` (label driven by flow), `↓ Review the plan` (#jumpPlan, smooth scroll to #planBuilder), `👵 Open Margaret's portal` (.openPortal, hidden until sent). Then the 3-step stepper `ol.flow3`.
2. KPIs: Door to needle 28 min (target ≤ 45, −17 vs median); NIHSS 1 now (6 on arrival, −5); Length of stay 3 days (expected 4); Systolic BP (24 h) 128 mmHg (target < 130, on perindopril); AF burden 4 % (3 episodes, anticoagulate, warn); 30-day readmission 14 % risk (LACE+ adjusted, with follow-up).
3. `Admission summary` (tag ENCOUNTER): Diagnosis `Acute ischaemic stroke, L MCA (M2) territory`; Treatment `Tenecteplase 0.25 mg/kg at 02:52 · DTN 28 min`; New finding `Paroxysmal AF on telemetry · CHA₂DS₂-VASc 5`; Imaging `CT/CTA: no haemorrhage; MRI D1: small L frontal infarct`; Echo `LVEF 58%, mild LA dilatation`; Function `Mild dysarthria improving · independent with stick · mRS 1`; Pre-arrival `Packet received 17 min before arrival (No One Alone)`.
4. `Inpatient course`: 15 Oct 02:24 Arrival · pre-alert packet on file; stroke team at door / 02:31 CT/CTA: no haemorrhage, L M2 occlusion / 02:52 Tenecteplase given (DTN 28 min) / 03:40 NIHSS 6 → 3 / 16 Oct Telemetry: 3 episodes paroxysmal AF; MRI small L frontal infarct / 16 Oct Speech pathology: mild dysarthria, home exercises / 17 Oct Physio: independent with stick, stairs with rail · OT home check booked / 17 Oct Fit for discharge · aspirin stopped, apixaban started.
5. `#planBuilder` card `📝 Discharge and recovery plan`, meta `Edit, approve, and the agent delivers it to Margaret's portal in plain English`.

### 2.2 Plan contents (`PLAN`)

Medicines table (`.medtab{min-width:900px}`, inputs `.inp`), columns: Medicine, Dose, Morning 08:00, Midday 13:00, Evening 18:00, Night 21:00, Change (select New/Increased/Continue/Stop), Note for patient, ✕ remove. `+ Add medicine` adds `['New medicine','',[1,0,0,0],'New','What it is for']`.

| Medicine | Dose | Slots (M,Mid,E,N) | Change | Note |
|---|---|---|---|---|
| Apixaban | 5 mg | 1,0,1,0 | New | Stops clots forming because of the uneven heartbeat. Replaces aspirin. |
| Perindopril | 4 mg | 1,0,0,0 | New | Lowers blood pressure and protects the brain. |
| Atorvastatin | 40 mg | 0,0,0,1 | Increased | Lowers cholesterol. Dose raised from 20 mg. |
| Amlodipine | 5 mg | 0,0,1,0 | Continue | Blood pressure tablet, as before. |
| Vitamin D | 1000 IU | 1,0,0,0 | Continue | For bones, as before. |
| Aspirin | 100 mg | 0,0,0,0 | Stop | Stop taking this. Apixaban does its job now. |

Instructions (toggle boxes, `[on, icon, text, time]`): 🚶 Walk 20 minutes daily (10:00); 🩺 Check blood pressure morning and evening, target under 130/80 (08:15 · 18:15); 🗣️ Speech exercises 15 minutes (14:00); 💧 Drink 1.5 L of water a day (through the day); 🧂 Low-salt food, under 5 g a day; 🚗 No driving for 1 month; 🚨 Call 000 straight away if face drooping, arm weakness or speech trouble.

Follow-up: GP review, Dr Patel — Fri 23 Oct, 10:30; Physio home visit — Tue 20 Oct; Speech pathology (weekly × 6) — from Thu 22 Oct; Stroke clinic, Camperdown — Mon 30 Nov, 09:00; Blood test (kidneys, on apixaban) — Fri 23 Oct.

Agent follow-up calls: chips `Day 1`, `Day 3`, `Day 7`, `Day 14`, `Day 30` (all on; on = `✓ ` prefix, brand background, aria-pressed).

Bottom row: `✅ Approve and send to Margaret` (#sendPlan, also .sendPlanBtn) + note `The agent translates the plan into plain English, sets reminders and shares it with her care circle according to Margaret's own settings.` then `ol.sendsteps#sendSteps`.

### 2.3 Three-step flow

`ol.flow3` items: `1 Review the plan`, `2 Finalise (doctor signs)`, `3 Approve · Noa hands off to Margaret`. State s = sent?3 : final?2 : 1; earlier steps `.done` with ✓, current `.cur`.

```css
.flow3{list-style:none;display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:12.5px}
.flow3 li{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--glass-2);box-shadow:var(--glass-edge);opacity:.6}
.flow3 li b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--track);font-size:10.5px}
.flow3 li.cur{opacity:1;box-shadow:inset 0 0 0 1.5px var(--brand);font-weight:600}.flow3 li.cur b{background:var(--brand);color:#fff}
.flow3 li.done{opacity:1}.flow3 li.done b{background:var(--good);color:#fff}
#planBuilder.final .medtab,#planBuilder.final .grid2{opacity:.75}
.sig{font-size:13px;padding:8px 12px;border-radius:12px;background:rgba(31,143,95,.12)}
.lnk{background:none;border:0;color:var(--brand);font:inherit;font-weight:600;cursor:pointer;text-decoration:underline}
```

Behaviour of every `.sendPlanBtn`:
1. Draft: label `✍️ Finalise the plan`. Click sets `PLAN.final=true`, toast `Plan finalised and signed. Now approve to hand it to the agent.` All plan inputs disabled. Signature line above the send row: `✍️ Finalised by <b>Dr Amelia Ross</b>, stroke registrar · 17 Oct 10:42 · <button class="lnk" data-unfinal>Edit again</button>` (Edit again reverts to draft; hidden after sending).
2. Final: label `✅ Approve and hand off to Noa`. Click: all send buttons disabled, `⏳ Agent is delivering…`, then 7 steps appended every 550 ms (50 reduced) as `<li class="done"><span>✓</span><span>{text}</span></li>`:
   - `Checking the plan: no interactions between apixaban, perindopril, atorvastatin, amlodipine`
   - `Writing a plain-English summary for Margaret (reading age 9)`
   - `Building her daily medicine schedule and reminders`
   - `Booking agent follow-up calls: Day 1, Day 3, Day 7, Day 14, Day 30` (selected days)
   - `Updating her pill box and pharmacy (aspirin stopped)`
   - `Sharing with her care circle according to Margaret's settings`
   - `Delivered to Margaret's portal ✓`
3. Done: `PLAN.sent=true`, buttons `✓ Sent to Margaret` (the #sendPlan first shows `✓ Sent to Margaret · HH:MM`), toast `Recovery plan delivered to Margaret's portal`, `.openPortal` buttons shown, stepper at step 3, ED board gets a row `Margaret C., 78 · 17 Oct · Ischaemic stroke, thrombolysed; new pAF · risk pill 14%`, and the hand-off drawer opens.

Hand-off drawer (`openInfo`): title `🤝 Noa hands off to Margaret`, intro `The plan is approved. Noa now takes over and talks to Margaret on her phone, in hearing mode.` then `ol.hchat` lines appear one by one every 900 ms (60 reduced), then buttons `👵 Open Margaret's portal` (.openPortal2) and `💬 Ask Noa`. Who labels: `{mini} Noa` / `👵 Margaret`.

Hand-off lines (`handoffLines()`, values from the plan):
1. Noa: `Welcome home, Margaret. It's Noa 💙 The hospital has sent your recovery plan, and I've put it in your app in plain English.`
2. Noa: `You have 2 new tablets: apixaban and perindopril. Please stop taking aspirin. I've told the pharmacy and updated your pill box.`
3. Margaret: `Thank you, love. That's a lot to remember.`
4. Noa: `Don't worry, I'll remind you every time, out loud and on the screen. Your next one is at {first schedule time}: {task}.` (default 08:00: apixaban 5 mg + perindopril 4 mg + Vitamin D 1000 IU)
5. Noa: `I'll also remind you about your walk at 10:00, blood pressure checks and speech exercises at 14:00. Your GP review, Dr Patel is Fri 23 Oct, 10:30. David can drive you.`
6. Noa: `I'll call you tomorrow at 17:00 to see how you're going. If your face drops, an arm feels weak or your speech goes funny, press Help and I'll call 000.`
7. Margaret: `Lovely. Thank you, dear.`

```css
.hchat{list-style:none;display:flex;flex-direction:column;gap:8px}
.hchat li{max-width:88%;display:grid;gap:3px}
.hchat .who{font-size:10.5px;font-weight:700;color:var(--muted);font-family:var(--mono)}
.hchat .b{padding:9px 12px;border-radius:16px;background:var(--glass-2);box-shadow:var(--glass-edge);font-size:13.5px;line-height:1.45}
.hchat li.ag{align-self:flex-end}.hchat li.ag .who{text-align:right}
.hchat li.ag .b{background:linear-gradient(160deg,#0b7f71,#139a86);color:#fff;border-bottom-right-radius:5px;box-shadow:none}
.hchat li.ot .b{border-bottom-left-radius:5px}
.hchat li.new .b{animation:pop7 .35s ease} @keyframes pop7{from{opacity:0;transform:translateY(6px)}}
```

"Open Margaret's portal" switches to who=self, page=recovery, scrolls top; from the hand-off it also auto-opens the next reminder after 1.2 s with toast `⏰ Reminder on Margaret's phone`.

### 2.4 Margaret's side (Recovery tab)

Tabs: family gets `🌱 Recovery` (inserted at index 6), self gets `🌱 My recovery` (index 2). Page title `Recovery · Margaret Collins`.

Before sending: idle card 🌱 `{Your|Margaret's} recovery plan will appear here` / `When the hospital approves a discharge plan, the agent delivers it here in plain English: medicines with reminders, walks, exercises, appointments and warning signs.` Buttons `🏥 Open the hospital view to send the plan` (data-go=patient) and `⚡ Send the example plan now` (sends quietly, marks final+sent, toast `Example plan delivered by the agent`).

After sending (self says "Your/You", family says "Margaret's/Her"):
- c8 `🌱 Your recovery plan`, meta `From Camperdown Stroke Centre · sent by the agent`. Text `You had a small stroke on 15 October. The hospital treated it quickly and you are recovering well. They also found your heartbeat is sometimes uneven, so there is a new tablet to stop clots.` Progress `Day {d} of 30` bar + `{done} of {n} done today`. Chips: `⛔ Stop: Aspirin` (bad colour), `🚗 No driving for 1 month`, `🧂 Less salt`, `💧 1.5 L water`.
- c4 `⏰ Next reminder`: big time (`.nr-time` mono 44px weight 300), `.nr-t` 18px task, why text, `🔔 Show the reminder now`. When all done: `🎉 All done for today` / `Well done, Margaret.`
- c6 `💊 Today's tablets and tasks` (meta `Tap when done`): rows `time | icon | task + why | Taken/Done button or ✓ HH:MM pill`. Toast on tap `Nice one 👍 Logged.`
- c6 `📋 Your medicines, explained`: `{name} {dose} · {slots lowercase}` + note + pill (New/Increased = warn, Continue = plain). Stopped meds excluded.
- c4 `🗓️ Appointments`: active follow-ups with `Add` button, toast `Added to the calendar · David can drive`.
- c4 `🚨 Call 000 straight away if…`: 😐 Face drooping on one side; 💪 Arm or leg weak or numb; 🗣️ Speech slurred or confused; ⏱️ Time matters. Don't wait. Button `📞 Call 000` (toast `Calling 000 · ask for ambulance`). `.fast{box-shadow:var(--glass-edge),inset 0 0 0 1.5px rgba(239,78,74,.4)}`.
- c4 `📞 Helper check-in calls` (meta self `A short chat to see how you are`, family `Short chats with Margaret`): Day 1 `How are you feeling, any headaches?`; Day 3 `New tablets going OK?`; Day 7 `Ready for the GP visit`; Day 14 `Walking and speech progress`; Day 30 `How is life back to normal?`. Status: Day 1 `Today 17:00` (or `Done ✓` after day 1), others `Planned`. Button `⏩ Jump to the next day` (toast `Day {n} · new reminders set`, clears ticks).
- c12 `💬 From Noa` (self) / `💬 What Noa told Margaret` (family), meta `After the hospital approved the plan`, `Ask Noa` button, and the same hchat lines as 2.3.

Schedule (`schedule()`): non-stopped meds grouped per slot (joined ` + `), plus 10:00 🚶 Walk for 20 minutes (`Gentle walking helps the brain heal and keeps blood pressure down.`), 08:15 and 18:15 🩺 Check your blood pressure (`Sit for 5 minutes first. Aim for under 130/80.` / `Evening reading.`), 14:00 🗣️ Speech exercises, 15 minutes (`Practise the sounds from your speech therapist.`), 11:00 and 16:00 💧 Drink a glass of water (`Aim for 1.5 L today.` / `Halfway there.`). Sorted by time.

Reminder drawer: title `⏰ It's {time}`, 44px icon, task 22px/600, why 15px, fine `Margaret also hears this on her phone and sees it on the pill box light.` Buttons `✓ Taken|Done` (toast `Logged · the family will see a green tick`) and `⏰ Remind me in 10 min` (toast `Okay, I'll remind you again in 10 minutes`).

Older static hospital Discharge page also lists follow-up days: DAY 1 `Voice call, pain and confusion check`; DAY 3 `New medicines matched to old`; DAY 7 `GP visit booked, BP review`; DAY 14 `Mobility and falls check`; DAY 30 `Readmission risk re-scored`; fine `Warning signs go to the discharge nurse as well as the family.`

---

## 3. Phone frame ("Margaret's screen" / "Margaret's phone")

There is no status bar and no side buttons. The device is a rounded black bezel with a pill-shaped island drawn by `::before`.

```html
<div class="device"><div class="dev-screen dark" id="devLive"></div></div>   <!-- Live page, card "Margaret's screen", meta "Same moment" -->
<div class="device"><div class="dev-screen" id="simPhone"></div></div>        <!-- Simulator, card "📱 Margaret's phone" -->
```

```css
.device{width:100%;max-width:290px;margin:0 auto;aspect-ratio:300/600;border-radius:42px;padding:11px;background:#0b1414;box-shadow:0 0 0 2px #2c4442,0 24px 50px rgba(0,20,18,.4);position:relative}
.dev-screen{position:relative;height:100%;border-radius:32px;overflow:hidden;padding:44px 15px 16px;display:flex;flex-direction:column;gap:11px;background:linear-gradient(180deg,#d8f2ef,#bfe3dc 55%,#8fc8bb);color:#0d2a2a}
.dev-screen.dark{background:linear-gradient(180deg,#141a36,#24193a 60%,#3a1d33);color:#f4f1f6}
.dev-screen::before{content:"";position:absolute;top:10px;left:50%;transform:translateX(-50%);width:88px;height:25px;border-radius:14px;background:#0b1414}  /* dynamic island */
.dev-flash{position:absolute;inset:0;background:rgba(255,138,106,.45);opacity:0;pointer-events:none}.dev-flash.on{animation:dflash .9s ease-in-out 3} @keyframes dflash{50%{opacity:1}}
.dev-h{font-size:12.5px;opacity:.75}
.dev-t{font-size:23px;font-weight:600;letter-spacing:-.3px}
.dev-q{font-size:22px;font-weight:500;line-height:1.25;padding:14px;border-radius:20px;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}
.dev-screen.dark .dev-q{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.dev-btns{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:auto}
.dev-b{min-height:92px;border-radius:22px;display:grid;place-items:center;align-content:center;gap:4px;font-size:19px;font-weight:600;color:#fff;text-align:center}
.dev-b .ic{font-size:26px}
.dev-b.ok{background:linear-gradient(160deg,#25b99f,#0b7f71)}
.dev-b.help{background:linear-gradient(160deg,#ff7a6e,#e0413d)}
.dev-help{display:flex;align-items:center;gap:10px;padding:11px;border-radius:18px;background:rgba(255,255,255,.12);font-size:16px}
.listen{display:flex;gap:5px;align-items:center;height:42px;justify-content:center}
.listen i{width:6px;border-radius:3px;background:#5fe0c8;animation:wave 1s ease-in-out infinite}  /* 5 bars, delays .1s steps */
@keyframes wave{0%,100%{height:10px}50%{height:36px}}
.dev-replies{display:grid;gap:6px;margin-top:10px}.dev-replies small{font-size:11px;opacity:.75}
.dev-replies button{text-align:left;padding:9px 12px;border-radius:14px;border:0;background:rgba(255,255,255,.92);color:#0d2a2a;font:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}
```

Simulator phone content:
- Idle: `<span class="dev-h">{HH:MM}</span><span class="dev-t">Goodnight, Margaret</span><div class="dev-q" style="font-size:18px">Sleep well. I'm here if you need anything 💙</div>` + buttons `I'm OK` (toast `The family knows you're OK`) and `Help me`.
- During a run: class `dark` (any phase except idle/stood). `<span class="dev-h">{HH:MM} · Hearing mode</span>`, Noa orb label, `.dev-q` = the last line Noa said to Margaret (quotes stripped) + `<small>Spoken aloud · large text</small>`, a `.listen` wave when the line ends in `?`, `🚑 Ambulance · {eta} min` and `👨 David is here` chips in `.dev-help`, and reply buttons (see 4.4).
- End states: green `Goodnight, Margaret. I'm here if you need me 💙`; amber `You're doing really well, Margaret. Help is on the way 💛`; red `The paramedics are here. You're in good hands, Margaret 💙`.

Live page fine print under the device: `Hearing mode is on, so every question is also shown in large text with yes/no buttons.`

Night alert screens on the original Live replay (`#devLive`, 10 steps, 2.8 s each, prev/play/next player):

| Time | Phase | Timeline text / sub | Screen text |
|---|---|---|---|
| 02:03 | Verify | Heart rate 142, no movement for 4 min / Night baseline 61. Not explained by activity. | `Margaret…` + small `Phone rings, screen flashes` (flash on) |
| 02:04 | Ask | Calls Margaret by voice. She answers slowly / Large-text questions on her screen too | `Margaret, it's your check-in. Can you hear me?` + Yes / No buttons |
| 02:04 | Ask | Repeat-after-me check: speech is slurred / Articulation score 0.41 (baseline 0.94) | `Please say after me: "The sky is blue in Sydney."` + listen wave |
| 02:04 | Triage | Level: emergency now / Last known well 01:55 | `Sit still, love. Don't try to stand up.` |
| 02:04 | Escalate | David and you are alerted / Sarah in London gets updates | `I've called David.` |
| 02:05 | Escalate | David: "I'm on my way" / He owns the case. Everyone sees it. | `David is on his way.` + `D David · 6 min away` |
| 02:06 | Escalate | You call 000 with the prepared script / Address, age, symptoms, medicines, access | `James is calling an ambulance.` (David · 5 min away) |
| 02:07 | Hand off | Camperdown Stroke Centre received her record / Chosen for 24/7 stroke care · 11 min | `The hospital has your details.` (4 min) |
| 02:11 | Escalate | David is with Margaret / Door unlocked, she is sitting, alert | `David is here, love.` (David is with you) |
| 02:21 | Hand off | Ambulance arrives · stroke team ready / ED read the packet 14 min before arrival | `The ambulance is here. You're in good hands.` (David is going with you) |

SLA strip: Alert → verified 41 s; Verified → escalated 58 s; Accepted 1:12; At the door 8 min; ED notice before arrival 14 min. Sub line during replay `Live · {t} AEDT · 186 Marrickville Rd`.

Note: in the final build, the Live tab is replaced by the simulator (`🚨 Emergency` tab, page `sim`), and `startEm` is reassigned, so both `Night alert demo` (top bar, #runDemo) and `Run the 02:03 night alert demo` (data-demo) now open the simulator with the `night` preset and start it. The table above is only reachable if the old Live page is kept.

---

## 4. Simulator (night alert demo)

### 4.1 Layout (page `sim`, title `Emergency · Margaret Collins`)

- c4 `🎛️ Simulator` (meta `Try Noa safely`):
  - Preset buttons: `🌙 Night emergency` (night), `🪜 Climbed stairs` (stairs), `😴 Sound asleep` (asleep). Click: stop, load preset, log `🎛️ Scenario loaded: {name}. Press Start.`, toast `Scenario loaded · press Start`, then auto-runs.
  - How-to `ol.howto`: 1 `Drag heart rate above 120`; 2 `Drag not moving to 10 minutes`; 3 `Noa steps in by itself, talks to Margaret and works out what is wrong`; 4 `Optional: tap Margaret's replies on her phone to change the story`.
  - Slider `❤️ Heart rate` `#hrS` range 45–180 (default 64), value label `{n} bpm`.
  - Slider `🛋️ Not moving for` `#stillS` range 0–15 step 1, label `Moving` or `{n} min` (+ ` ⚠️` at ≥10); ticks `0`, `5`, `10 min · alert` (red, bold), `15`. `#stillS{accent-color:#0b7f71}`.
  - `<details class="more"><summary>More options: who answers the phone</summary>`: `📞 James picks up` Yes/No, `📞 David picks up` Yes/No (default No/No).
  - Buttons `▶️ Start` / `⏸️ Pause` / `▶️ Resume` (#simPlay, title `Monitoring runs live. Pause it any time.`), `⏩ Faster` / `🐢 Normal speed`, `↺ Reset`.
- c8 `📈 Live readings` (meta `One reading per minute from her watch and home sensors`, clock `.clock` mono 22px starting `01:30`): SVG chart 700×200, 40 readings, y 40–180, grid 60/100/120/160, dashed red line at 120 `alert line 120` (`#d9443f`), line `#ef6a5e` 2.2px, dots on the counting run, movement strip (green `#1fb39c` moving / `#c9d3d1` still), labels `−40 min · green = moving` and `now HH:MM`. Rule card: `Heart rate above 120 for 10 minutes while she is not moving` / `{n} of 10 minutes · now {hr} bpm · {moving|not moving}` with progress bar; note one of: `🚨 Noa is checking on her`, `Heart rate is high but she is moving (stairs, gardening): no alert`, `Still, but heart rate is normal (sleeping, resting): no alert`, `Counting… Noa waits 10 minutes so a short spike does not wake anyone`, `All normal`.
- c5 Agent card (orb heading, `💬 Ask Noa`, status pill `#agentState`), decision box, `#agentNow` (default `Everything looks normal. Noa only steps in if both warning signs happen together.`), step list.
- c4 `📞 Calls in order` (meta `Priority list, then nearest person`): cards James (Son · priority 1, `#e07a3f`), David (Brother · nearest, 450 m, `#2f6fb0`), 000 (Ambulance, `#ef4e4a`); states Waiting / Ringing… / Answered HH:MM / No answer… ; `.ccard.ring` shakes. Sub-section `🔔 Alerts to her circle` (meta `Everyone with safety alerts on`), empty `🔕 No alerts sent / Nothing to report`.
- c3 `📱 Margaret's phone`.
- c12 `🎙️ Noa Speech Check` card (4.3).
- c7 `🎙️ Live conversations` (meta `Everything Noa says, and to whom`): filter chips `All` + per channel (👵 Margaret, 👨 James, 👴 David, 🚑 000, 🏥 Hospital, 👩‍⚕️ Nurse, 🩺 Doctor, 🚑 Paramedics, 👪 Family); transcript `ol.tx` lines `{HH:MM} · {orb} Noa → {channel}` or `{icon} {speaker}`; empty `Nothing said yet. Noa is watching quietly.`; fine `In a real service, 000 calls go through an approved emergency relay and a human operator always takes over. The script is fixed and checked by clinicians, not made up by AI.`
- c5 `📦 Who got what` (meta `Each person gets only what they need · tap to see`); empty `🔒 Nothing shared / Information is only handed over when Noa acts`. Tap opens a drawer with key-value rows and `Shared under Margaret's own settings. Every hand-over is logged and she can see it later.`
- c12 `🗒️ Noa's log` (meta `Every step, time-stamped`), empty `👀 Watching quietly. Nothing to report.`

### 4.2 Rule, timing, presets

- Rule: last N consecutive readings with HR > 120 and not moving; alert when N ≥ 10.
- Sim clock base 01:30. Speed (sim-seconds per real second): waiting phases (idle, g2, a4, enroute, stood, done) 60 (Faster 240); dialogue phases 4 (Faster 10). Tick every 200 ms, dt capped 0.5 s. One reading per sim minute, last 40 kept.
- Presets: `night` 34 readings ~58–63 then 141,138,134,132,128,124 (newest last reversed), last 8 still, HR 142, still 8 min, James/David No; `stairs` high HR 132 but moving; `asleep` HR ~57, still 45 min; `blank` ~62–67 moving.
- Moving the sliders after a finished run resets to a fresh watch (`👀 Watching again.`) and keeps running. Help me on the phone when idle injects 10 readings at 142 still (log `🆘 Margaret pressed "Help me".`); during ask/feel it forces red (`🆘 Margaret pressed "Help me": treating as red.`).
- Body gets `.night` when the alert starts; removed at the end (red: 4 s after paramedics).

### 4.3 Dialogue (final version)

Detection log: `🔎 Warning sign: heart rate above 120 for 10 minutes while she isn't moving (now {hr} bpm). Checking on Margaret first, before waking anyone.`

Base steps: 🔎 Notice the warning sign; 💬 Check on Margaret; 🗣️ Speech test; 🩺 Ask how she feels; 🧭 Decide: green, amber or red. Step states show `Done`, `Now`, `Failed`/`No answer`, `Skipped`.

1. ask (e=0): Noa `"Hello Margaret, it's Noa. I noticed your heart has been racing for about 10 minutes while you've been sitting still. Are you all right?"`. Reply buttons on the phone (`Answer as Margaret, or she replies by herself in {s} s`, auto after 26 sim-s, default `unclear`): `"I'm fine, couldn't sleep"` → `"Oh hello love. Yes, I'm fine. I just couldn't sleep."`; `"My heart's racing a bit"` → `"Hello… my heart's racing a bit."`; `"Mm… ye… s…"` → `"Mm… ye… s…" (slow, hard to understand)`. Tapping I'm OK: `👆 Margaret tapped "I'm OK". Noa still runs the speech test to be sure.`
2. speech: Noa `"Thank you, Margaret. Let's do our quick speech check, the same one from our morning chats. Please say after me: The sky is blue in Sydney."` After 10 s Margaret answers clear `"The sky is blue in Sydney."` or (if hello was unclear) slurred `"Th… sky… iz… bloo… Sid…" (slow and slurred)`. Log `⚠️ Noa Speech Check: slurred and slow compared with her own voice (clarity 0.41, her normal 0.94). Possible stroke.` or `✅ Noa Speech Check: clear, matches her own voice (clarity 0.93, her normal 0.94).` Slurred → speech Failed, feel Skipped, go decide.
3. feel: Noa `"That was lovely and clear, Margaret, well done. Now, how are you feeling? Any chest pain, dizziness, weakness in your arm or face, or have you had a fall?"` Buttons `"No, none of that"` / `"I feel dizzy"` / `"My arm feels weak"` → `"No, none of that. I had a bad dream and got up for a cup of tea."` / `"No pain. But I feel dizzy and my heart is fluttering."` / `"My left arm feels heavy… I can't lift it properly."` (default dizzy if racing, else none).
4. decide: red if Help pressed, slurred or arm pain; amber if dizzy; else green. Decision box (`.dec` with 5px left border `#1f8f5f`/`#e2a32c`/`#ef4e4a`):
   - `🟢 Green: she's fine` / `Speech is clear, no warning symptoms and she sounds like herself. Stay calm and don't wake anyone.`
   - `🟡 Amber: unwell, but talking clearly` / `Speech is clear but she is dizzy with a fast, fluttering heartbeat. She needs a check tonight, not an ambulance yet.`
   - `🔴 Red: possible stroke` / speech: `Her speech is slurred. Time matters, so Noa skips further questions and calls for help now.`; arm: `Her speech is clear, but sudden arm weakness is a stroke warning sign. Noa calls for help now.`; help: `She pressed Help and could not say what was wrong. Noa calls for help now.`
   - Before a decision: `Next steps depend on her answers` / `🟢 fine → calm her and re-check · 🟡 unwell but clear → nurse + family · 🔴 slurred, no answer, chest pain, weakness or a fall → 000`

Green steps: 🫖 Calm her: water and slow breaths; ⏱️ Re-check her heart in 10 minutes; 📝 Morning note for the family. Lines: breathing script, Margaret `"Thank you, dear. I'll make a chamomile tea."`, re-check `"Hello again, Margaret. Your heart is back to {hr}, nice and steady. How do you feel now?"` / `"Much better, love. Off to bed now."`, morning note to James at 07:30. Ends `All clear`.

Amber steps: ⌚ Heart tracing on her watch; 👩‍⚕️ Video call with an on-call nurse (Nurse Kim); 📞 Tell James (priority 1); 📞 Ask David to come over (or home doctor Dr Lee about 02:20); ⏱️ Re-check in 10 min · 000 if worse. GP hand-over: Dr Patel morning summary, suggest anticoagulation review. Ends `Handled · help coming`.

Red steps: 🔔 Alert her whole circle; 📞 Call James (priority 1); 📍 Find the nearest person (`Nearest: David, 450 m (6 min walk), has a key. Aisha next door is away until 25 Oct. Priya is off duty.`); 📞 Call David (450 m); 🚑 Call 000 with the script; 🏥 Send her record to hospital; 🤝 Stay with her · hand over to paramedics. Circle alert text `Margaret may be having a stroke. Noa is calling for help now.` (Sarah (London) gets alert only, not heart/medicine details.) Enroute ETA counts 12 → 0 min; David arrives at 6 min (`"I'm here, Mags. I've got you."`); paramedics at 12 min; status labels map in `stLbl` (Watching, Checking on her, Speech test, …, On the line with 000, Ambulance on the way, Handed over).

### 4.4 Speech Check card (`#spkCard`, `.spk`)

Heading `{mini(22)} Noa Speech Check`, tag `OUR CORE TECHNOLOGY` (teal gradient), meta `Compares tonight's voice with Margaret's own voice, not an average`, verdict pill: `Ready · baseline from 41 morning chats` / `🎙️ Listening to Margaret…` / `Analysing against her own voice…` / `✓ Clear · matches her normal voice` / `⚠ Slurred speech detected · possible stroke`.

Waves: row `Her normal` (`baseline · 30 days`, colour `--spk-base:#9bb3b0`, night `#6f7f90`) and `Tonight` (time of check) drawn as deterministic bars per word of `The sky is blue in Sydney` with word labels; clear = `--good`, slurred = `--bad` with longer gaps after "is" and "in". While waiting: `Runs when Noa needs to check on her. Margaret repeats one short sentence.`; while listening `Margaret is repeating “The sky is blue in Sydney”` with 5 animated bars; analysing applies `svg.scan` mask sweep.

Five measures table (Measure | Her normal | Tonight, tonight cells coloured with a 4px bar):

| Measure | Her normal | Clear | Slurred |
|---|---|---|---|
| Clarity (articulation) | 0.94 | 0.93 | 0.41 |
| Speaking speed | 152 wpm | 148 wpm | 74 wpm |
| Pause between words | 0.22 s | 0.25 s | 0.90 s |
| Words recognised | 6 of 6 | 6 of 6 | 2 of 6 |
| Voice steadiness | steady | steady | shaky |

How strip: 1 `Learns her voice` from 2-minute morning chats; 2 `One sentence` when something looks wrong; 3 `5 measures` compared with her own normal, in under 2 seconds; 4 `Slurred = Red`: Noa skips questions and calls for help. Fine: `Hearing aids and accent are part of her baseline, so they do not cause false alarms. Only the scores are kept, not the recordings. In the demo the numbers are illustrative.` Layout `.spk-grid{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:18px}`, `.spk-how` 4 columns, both 1 column under 900px.

### 4.5 000 call (operator dialogue)

Each line every 9 sim-s starting at 4 s; card meta becomes `Live · HH:MM`; 000 state `Dialling 000…` → `Connected · speaking` → `Ambulance dispatched`.

1. Operator: `Emergency. Police, Fire or Ambulance?`
2. Noa: `Ambulance. This is Noa from No One Alone, calling for Margaret Collins, 78, female, who lives alone. Possible stroke.` (amber: `heart problem.`)
3. Operator: `What's the address?`
4. Noa: `186 Marrickville Road, Marrickville 2204. {Her brother David is on his way with a key. | Nobody is with her. Key lockbox by the front door.}`
5. Operator: `Tell me exactly what happened.`
6. Noa: `{Slurred speech|Left arm weakness|Help pressed, no clear answer} at {speechAt}, last seen well at {lkw}. She is awake and breathing, but confused. Heart rate {maxHR}. Not on blood thinners. Allergic to penicillin.` (amber: `Fast, irregular heartbeat and dizziness. ` prefix instead)
7. Operator: `An ambulance is on its way, about 12 minutes. Don't give her anything to eat or drink.`
8. Noa: `Thank you. Her details are going to Camperdown Stroke Centre, and I'm staying with her.`

Then log `🚑 Ambulance dispatched. ETA 12 min. Operator has the address, symptoms, times and medicines.` and hand-over `000 Ambulance` (Callback `Her mobile, 04xx xxx 218`; Address `186 Marrickville Road, Marrickville NSW 2204 · lockbox left of door`; Conscious `Yes, confused · hard of hearing`; Medicines `Amlodipine, aspirin, atorvastatin · not on blood thinners`; Allergy `Penicillin`). Pre-arrival to Camperdown: `"Margaret Collins, 78, female. Suspected stroke. Last seen well {lkw}. {cap} found {t}. Heart rate up to {hr}, irregular. On aspirin, not on blood thinners. Allergy: penicillin. Baseline: independent, hard of hearing. ETA 12 min. Next of kin: James (son)."` → Stroke team `"Received. Stroke call activated, CT scanner on standby."` Hospital FHIR hand-over includes MRN 0048213, NOK `James Collins (son) · 04xx xxx 218`, Consent `Emergency sharing, set by Margaret`.

---

## 5. Names and fixed text

- Product: `No One Alone`; agent: `Noa` (`your No One Alone agent`, `Margaret's No One Alone companion`, `Noa, the No One Alone care agent`). Older strings still say "the helper"/"health helper" in pre-patch code paths.
- Patient: Margaret Collins, 78, `Marrickville NSW 2204 · Inner West`, address `186 Marrickville Road, Marrickville NSW 2204` (short `186 Marrickville Rd`), key lockbox left of the front door, hard of hearing, allergy penicillin, pre-stroke meds amlodipine 5 mg, aspirin 100 mg, atorvastatin 20 mg.
- Hospital: `Camperdown Stroke Centre` (4.2 km, 11 minutes; stroke clinic Mon 30 Nov 09:00). Clinician `Dr Amelia Ross, stroke registrar`. GP `Dr Patel`. Nurse `Kim`. Home doctor `Dr Lee`.
- People (`PEOPLE2`): James (Son · Melbourne, `#e07a3f`, J, signed-in user "James Collins · son · Melbourne", avatar JC `#2f6fb0`), Sarah (Daughter · London, `#c2417a`), David (Brother · 450 m, `#2f6fb0`, has key), Priya (Priya Sharma, Community nurse · weekdays, `#8a6bd1`), Dr Patel (Her GP, `#0b7f71`), Hospital (Only in an emergency, `#2563a8`). Aisha: neighbour, 2 doors down, key holder, `#c2611f`, away 18–25 Oct.
- Sharing categories (11): Safety alerts, "I'm OK" check-ins, Heart/blood pressure/body, Sleep, Moving and steps, Mood and feelings, Tablets, Hearing and speech, Home sensors, Health records, Home or out.

## 6. Background CSS (end of file)

`.scene svg{display:none} .scene{background:#8fc3e6 url(data:image/...;base64 ~32.5 KB day image) center/cover no-repeat} .scene::after{content:"";position:absolute;inset:0;background:url(data:image/...;base64 ~54.8 KB night image) center/cover no-repeat;opacity:0;transition:opacity 1.2s ease} body.night .scene::after{opacity:1}`
