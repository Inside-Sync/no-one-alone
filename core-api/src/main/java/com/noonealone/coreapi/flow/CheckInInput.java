package com.noonealone.coreapi.flow;

public record CheckInInput(byte[] audio, String mimeType, String yesNo, boolean noReply) {

    public static CheckInInput ofAudio(byte[] audio, String mimeType) {
        return new CheckInInput(audio, mimeType, null, false);
    }

    public static CheckInInput ofYesNo(String yesNo) {
        return new CheckInInput(null, null, yesNo, false);
    }

    public static CheckInInput ofNoReply() {
        return new CheckInInput(null, null, null, true);
    }

    public boolean hasPersonTurn() {
        return !noReply;
    }
}
