package com.noonealone.coreapi.store;

import java.time.Clock;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Component;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import com.noonealone.coreapi.data.SeedData;
import com.noonealone.coreapi.model.DemoCurrent;
import com.noonealone.coreapi.model.Docs;
import com.noonealone.coreapi.model.Hospital;
import com.noonealone.coreapi.model.Incident;
import com.noonealone.coreapi.model.Person;
import com.noonealone.coreapi.model.StoryClock;
import com.noonealone.coreapi.web.ApiException;

@Component
public class IncidentStore {

    @FunctionalInterface
    public interface Change {
        boolean apply(Incident incident, String now);
    }

    public record Mutation(Incident incident, boolean changed) {}

    private final Firestore db;
    private final Clock clock;

    public IncidentStore(Firestore db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }

    public boolean createIfAbsent(Incident incident) {
        DocumentReference ref = incidentRef(incident.id);
        return call(db.runTransaction(tx -> {
            if (tx.get(ref).get().exists()) {
                return false;
            }
            tx.set(ref, Docs.toMap(incident));
            return true;
        }));
    }

    public Optional<Incident> find(String id) {
        DocumentSnapshot snap = call(incidentRef(id).get());
        return snap.exists() ? Optional.of(read(snap)) : Optional.empty();
    }

    public Incident get(String id) {
        return find(id).orElseThrow(() -> ApiException.notFound("Incident " + id + " not found"));
    }

    public Mutation mutate(String id, Change change) {
        DocumentReference ref = incidentRef(id);
        return call(db.runTransaction(tx -> {
            DocumentSnapshot snap = tx.get(ref).get();
            if (!snap.exists()) {
                throw ApiException.notFound("Incident " + id + " not found");
            }
            Incident incident = read(snap);
            String now = StoryClock.now(incident.demo.clockOffsetMs, clock);
            if (!change.apply(incident, now)) {
                return new Mutation(incident, false);
            }
            incident.version++;
            incident.updatedAt = now;
            tx.set(ref, Docs.toMap(incident));
            return new Mutation(incident, true);
        }));
    }

    public Optional<Incident> latest(String personId) {
        // ponytail: scans the person's incidents in memory, avoids a composite index; fine for a demo
        return call(db.collection("incidents").whereEqualTo("personId", personId).get()).getDocuments().stream()
                .map(IncidentStore::read)
                .max(Comparator.comparing((Incident i) -> i.createdAt == null ? "" : i.createdAt));
    }

    public void delete(String id) {
        call(incidentRef(id).delete());
    }

    public Optional<DemoCurrent> current() {
        DocumentSnapshot snap = call(currentRef().get());
        return snap.exists() ? Optional.of(Docs.fromMap(snap.getData(), DemoCurrent.class)) : Optional.empty();
    }

    public void setCurrent(DemoCurrent current) {
        call(currentRef().set(Docs.toMap(current)));
    }

    public void clearCurrent() {
        call(currentRef().delete());
    }

    public Person person(String id) {
        DocumentSnapshot snap = call(db.collection("people").document(id).get());
        if (!snap.exists()) {
            throw ApiException.notFound("Person " + id + " not found");
        }
        Person p = Docs.fromMap(snap.getData(), Person.class);
        p.id = id;
        return p;
    }

    public Map<String, Person> people() {
        Map<String, Person> result = new HashMap<>();
        for (DocumentSnapshot snap : call(db.collection("people").get()).getDocuments()) {
            Person p = Docs.fromMap(snap.getData(), Person.class);
            p.id = snap.getId();
            result.put(p.id, p);
        }
        return result;
    }

    public List<Hospital> hospitals() {
        return call(db.collection("hospitals").get()).getDocuments().stream().map(snap -> {
            Hospital h = Docs.fromMap(snap.getData(), Hospital.class);
            h.id = snap.getId();
            return h;
        }).toList();
    }

    public void seed(SeedData seed) {
        WriteBatch batch = db.batch();
        seed.people().forEach((id, p) -> batch.set(db.collection("people").document(id), Docs.toMap(p)));
        seed.hospitals().forEach((id, h) -> batch.set(db.collection("hospitals").document(id), Docs.toMap(h)));
        call(batch.commit());
    }

    private DocumentReference incidentRef(String id) {
        return db.collection("incidents").document(id);
    }

    private DocumentReference currentRef() {
        return db.collection("demo").document("current");
    }

    private static Incident read(DocumentSnapshot snap) {
        Incident incident = Docs.fromMap(snap.getData(), Incident.class);
        incident.id = snap.getId();
        return incident;
    }

    private static <T> T call(ApiFuture<T> future) {
        try {
            return future.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        } catch (ExecutionException e) {
            for (Throwable c = e.getCause(); c != null; c = c.getCause()) {
                if (c instanceof ApiException api) {
                    throw api;
                }
            }
            if (e.getCause() instanceof RuntimeException r) {
                throw r;
            }
            throw new IllegalStateException(e.getCause());
        }
    }
}
