package com.noonealone.coreapi.gcp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.noonealone.coreapi.config.NoaProperties;

@Component
public class AudioStore {

    private static final Logger log = LoggerFactory.getLogger(AudioStore.class);

    private final boolean enabled;
    private final String bucket;
    private final Storage storage;

    public AudioStore(NoaProperties props) {
        this.enabled = props.audio().enabled();
        this.bucket = props.audio().bucket();
        this.storage = enabled ? StorageOptions.getDefaultInstance().getService() : null;
    }

    public String save(String incidentId, String fileName, byte[] data, String contentType) {
        if (!enabled || data == null) {
            return null;
        }
        String path = "audio/" + incidentId + "/" + fileName;
        try {
            storage.create(BlobInfo.newBuilder(bucket, path).setContentType(contentType).build(), data);
            return path;
        } catch (RuntimeException e) {
            log.warn("Could not store {}", path, e);
            return null;
        }
    }

    public void deleteIncident(String incidentId) {
        if (!enabled) {
            return;
        }
        try {
            for (Blob blob : storage.list(bucket, Storage.BlobListOption.prefix("audio/" + incidentId + "/")).iterateAll()) {
                blob.delete();
            }
        } catch (RuntimeException e) {
            log.warn("Could not delete audio for {}", incidentId, e);
        }
    }
}
