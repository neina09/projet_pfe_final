package com.backend.Projet.service;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ReceiptOcrAnalysis {
    boolean available;
    boolean verified;
    boolean referenceMatched;
    boolean amountMatched;
    boolean dateDetected;
    boolean successKeywordDetected;
    String detectedDate;
    String rawText;
    String summary;
}
