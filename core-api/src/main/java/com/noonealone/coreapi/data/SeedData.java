package com.noonealone.coreapi.data;

import java.util.Map;

import com.noonealone.coreapi.model.Hospital;
import com.noonealone.coreapi.model.Person;

public record SeedData(Map<String, Person> people, Map<String, Hospital> hospitals) {}
