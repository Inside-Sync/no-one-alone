package com.noonealone.coreapi.model;

import java.util.List;

public class Assessment {
    public String clarity; public Boolean coherent; public List<String> symptoms; public Double confidence;
    public Pronunciation pronunciation;

    public static class Pronunciation { public Double accuracy; public Double fluency; public Double completeness; public Double overall; }
}
