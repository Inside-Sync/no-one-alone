"""scripts/load_fhir.py against an in-memory store: dry run writes nothing, conflicts abort, reruns are no-ops."""
import copy

import pytest

from scripts import load_fhir
from tests.fake_store import STORE, TOKEN, FakeStore, bundle_resources


def run(store: FakeStore, *args):
    return load_fhir.main(["--store", STORE, *args], token_provider=lambda: TOKEN,
                          transport=store.transport(), async_transport=store.transport())


def writes(store):
    return [c for c in store.calls if c[0] != "GET"]


@pytest.mark.parametrize("pid", load_fhir.PEOPLE)
def test_the_shipped_bundles_pass_every_precheck(pid):
    assert load_fhir.problems(load_fhir.load_bundle(pid), pid) == []


@pytest.mark.parametrize("change,expect", [
    (lambda b: b["entry"][1]["resource"]["meta"].update(tag=[]), "HTEST"),
    (lambda b: b["entry"][0]["resource"].update(birthDate="1948-03-03"), "birthDate"),
    (lambda b: b["entry"][1]["resource"].update(subject={"reference": "Patient/someone-else"}), "not in bundle"),
    (lambda b: b["entry"][1]["request"].update(method="POST"), "PUT"),
    (lambda b: b["entry"][1]["resource"].update(id="other-person-x"), "id is not"),
    (lambda b: b.update(type="collection"), "transaction"),
])
def test_prechecks_catch_unsafe_bundles(change, expect):
    b = copy.deepcopy(load_fhir.load_bundle("ba-mai"))
    change(b)
    assert any(expect in p for p in load_fhir.problems(b, "ba-mai"))


def test_dry_run_reads_only_and_writes_nothing(capsys):
    store = FakeStore()
    assert run(store) == 0
    assert writes(store) == [] and store.resources == {}
    assert "DRY RUN: would create 22 of 22 resources" in capsys.readouterr().out


def test_write_creates_everything_in_one_transaction_then_verifies(capsys):
    store = FakeStore()
    assert run(store, "--write") == 0
    assert len(writes(store)) == 1 and len(store.resources) == 22
    out = capsys.readouterr().out
    assert "WROTE 22 resources" in out and "VERIFIED live equals fixture for ba-mai, margaret" in out


def test_second_run_is_a_no_op_with_no_new_versions(capsys):
    store = FakeStore()
    run(store, "--write")
    before = copy.deepcopy(store.resources)
    store.calls.clear()
    assert run(store, "--write") == 0
    assert writes(store) == [] and store.resources == before
    assert "WROTE 0 resources" in capsys.readouterr().out


def test_only_missing_resources_are_sent():
    store = FakeStore(bundle_resources("ba-mai"))
    sent = []
    real = store._transaction
    store._transaction = lambda b: sent.append([e["resource"]["id"] for e in b["entry"]]) or real(b)
    assert run(store, "--write") == 0
    assert len(sent) == 1 and len(sent[0]) == 14 and all(i.startswith("margaret") for i in sent[0])


def test_a_differing_resource_aborts_before_anything_is_written(capsys):
    changed = bundle_resources("margaret")
    changed[1]["clinicalStatus"] = {"text": "resolved"}
    store = FakeStore(changed[:2])
    assert run(store, "--write") == 1
    assert writes(store) == [] and len(store.resources) == 2
    err = capsys.readouterr().err
    assert "differ from ours" in err and "nothing was written" in err


def test_dry_run_reports_conflicts_with_a_failing_exit(capsys):
    changed = bundle_resources("ba-mai")
    changed[0]["gender"] = "male"
    assert run(FakeStore(changed[:1])) == 1
    assert "CONFLICT Patient/ba-mai" in capsys.readouterr().out


def test_store_without_update_create_is_refused():
    store = FakeStore(update_create=False)
    assert run(store, "--write") == 1
    assert writes(store) == [] and store.resources == {}


def test_verify_is_read_only_and_detects_a_wrong_store(capsys):
    store = FakeStore([r for p in load_fhir.PEOPLE for r in bundle_resources(p)])
    assert run(store, "--verify") == 0 and writes(store) == []
    store.resources.pop(("Consent", "margaret-hospital-sharing"))
    assert run(store, "--verify") == 1
    assert "margaret: live resources differ" in capsys.readouterr().out


def test_a_bad_store_name_is_refused_before_any_call():
    store = FakeStore()
    assert load_fhir.main(["--store", "records"], token_provider=lambda: TOKEN, transport=store.transport()) == 2
    assert store.calls == []


def test_write_and_verify_cannot_be_combined():
    with pytest.raises(SystemExit):
        load_fhir.main(["--store", STORE, "--write", "--verify"])
