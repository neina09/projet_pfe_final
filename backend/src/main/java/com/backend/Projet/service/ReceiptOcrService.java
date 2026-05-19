package com.backend.Projet.service;

import java.math.BigDecimal;

public interface ReceiptOcrService {
    ReceiptOcrAnalysis analyzeReceipt(String storedReceiptPath, String transferReference, BigDecimal expectedAmount);
}
