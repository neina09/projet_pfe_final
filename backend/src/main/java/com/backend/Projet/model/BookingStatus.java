package com.backend.Projet.model;

public enum BookingStatus {
    PENDING,    // في الانتظار
    ACCEPTED,   // قبل العامل
    REJECTED,   // رفض العامل
    COMPLETED,  // اكتمل
    CANCELLED   // ألغى المستخدم
}