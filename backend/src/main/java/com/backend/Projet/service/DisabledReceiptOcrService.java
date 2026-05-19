package com.backend.Projet.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@ConditionalOnProperty(prefix = "app.worker-subscription.ocr", name = "enabled", havingValue = "false", matchIfMissing = true)
public class DisabledReceiptOcrService implements ReceiptOcrService {

    @Override
    public ReceiptOcrAnalysis analyzeReceipt(String storedReceiptPath, String transferReference, BigDecimal expectedAmount) {
        return ReceiptOcrAnalysis.builder()
                .available(false)
                .verified(false)
                .referenceMatched(false)
                .amountMatched(false)
                .dateDetected(false)
                .successKeywordDetected(false)
                .rawText("")
                .summary("OCR is disabled. Receipt requires manual admin review.")
                .build();
    }
}
