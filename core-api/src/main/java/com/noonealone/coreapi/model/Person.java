package com.noonealone.coreapi.model;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class Person {
    @JsonIgnore public String id;
    public String displayName;
    public Integer age;
    public String sex;
    public String timezone;
    public String locale;
    public String dialect;
    public String addressText;
    public String emergencyNumber;
    public LatLng location;
    public Map<String, String> accessibility;
    public Map<String, Integer> baseline;
    public List<CircleEntry> circle;
    public List<String> meds;
    public List<String> allergies;

    /** The language this person is spoken to in: "ar" for an Arabic locale, otherwise "en". */
    public String language() {
        return locale != null && locale.toLowerCase().startsWith("ar") ? "ar" : "en";
    }
}
