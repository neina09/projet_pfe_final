package com.backend.Projet.util;

import com.backend.Projet.exception.BusinessException;

public final class MauritaniaPhoneUtils {

    private MauritaniaPhoneUtils() {
    }

    public static String normalize(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new BusinessException("Phone number is required");
        }

        String digitsOnly = rawPhone.replaceAll("\\D", "");
        if (digitsOnly.startsWith("222") && digitsOnly.length() == 11) {
            digitsOnly = digitsOnly.substring(3);
        }

        if (!digitsOnly.matches("^[2-4][0-9]{7}$")) {
            throw new BusinessException("Phone must be a valid Mauritanian number");
        }

        return digitsOnly;
    }
}
