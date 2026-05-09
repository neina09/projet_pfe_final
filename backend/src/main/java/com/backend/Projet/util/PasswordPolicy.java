package com.backend.Projet.util;

import com.backend.Projet.exception.BusinessException;

public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 64;
    private static final String POLICY_MESSAGE = "Password must be 8 to 64 characters and contain at least one letter and one digit";

    private PasswordPolicy() {
    }

    public static void validateOrThrow(String password) {
        String value = password == null ? "" : password;

        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new BusinessException(POLICY_MESSAGE);
        }
        if (!value.matches(".*[A-Za-z].*") || !value.matches(".*\\d.*")) {
            throw new BusinessException(POLICY_MESSAGE);
        }
    }
}
