package com.noonealone.coreapi.model;

import java.util.LinkedHashMap;
import java.util.Map;

/** The `params` of a timeline line: name and value pairs, with null values left out. */
public final class Params {

    private Params() {}

    public static Map<String, Object> of(Object... pairs) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            if (pairs[i + 1] != null) {
                m.put((String) pairs[i], pairs[i + 1]);
            }
        }
        return m;
    }
}
