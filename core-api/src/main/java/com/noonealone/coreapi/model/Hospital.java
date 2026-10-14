package com.noonealone.coreapi.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class Hospital {
    @JsonIgnore public String id;
    public String name;
    public LatLng location;
    public boolean strokeReady;
}
