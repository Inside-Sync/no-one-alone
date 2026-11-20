param([string]$Project = "no-one-alone-511616", [string]$Region = "asia-southeast1")
$url = gcloud run services describe respond-agent --region $Region --project $Project --format="value(status.url)"
if (-not $url) { throw "respond-agent not found" }
$token = gcloud auth print-identity-token
$headers = @{ Authorization = "Bearer $token" }
$bodies = @(
    @{ path = "/noa/say"; json = '{"callId":"detect.guardian","lang":"en","params":{"audience":"Saeed","name":"Saeed","signal":"Heart 128 bpm at rest for 22 min","usual":"62 to 78 bpm","rule":"A resting heart rate far above the usual starts a check"}}' },
    @{ path = "/noa/say"; json = '{"callId":"referral.courier","lang":"ar","params":{"audience":"فريق العيادة","patient":"سعيد","age":"64","booked":["فحص السكري"],"for_doctor_decision":["مراجعة ضغط الدم"],"home_screening":{"speech_score":0.92},"flags":["خطر القلب والسكتة"]}}' },
    @{ path = "/noa/understand"; json = '{"qid":"rf","lang":"en","options":[{"id":"none","label":"No, I feel OK"},{"id":"weak","label":"Face or arm weakness"}],"reply":"my left arm feels heavy"}' }
)
foreach ($b in $bodies) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $r = Invoke-RestMethod -Method Post -Uri ($url + $b.path) -Headers $headers -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($b.json)) -TimeoutSec 20
        $words = if ($r.text) { ($r.text -split '\s+').Count } else { 0 }
        Write-Output ("{0} 200 source={1} reason={2} choice={3} words={4} ms={5}" -f $b.path, $r.source, $r.reason, $r.choice, $words, $sw.ElapsedMilliseconds)
    } catch {
        Write-Output ("{0} failed status={1} ms={2}" -f $b.path, $_.Exception.Response.StatusCode.value__, $sw.ElapsedMilliseconds)
    }
}
gcloud logging read 'jsonPayload.event="noa_call"' --project $Project --limit 3 --format="table(timestamp,jsonPayload.callId,jsonPayload.model,jsonPayload.result)"
