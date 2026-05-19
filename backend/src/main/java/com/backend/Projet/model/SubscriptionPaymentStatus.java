package com.backend.Projet.model;

public enum SubscriptionPaymentStatus {
    NOT_SUBMITTED,
    PENDING,
    APPROVED,      // Manually confirmed by admin
    AUTO_APPROVED, // Automatically verified by OCR
    REJECTED,
    EXPIRED
}
