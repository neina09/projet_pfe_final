package com.backend.Projet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordDto {
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^(\\+222|222)?[2-4][0-9]{7}$", message = "Phone must be a valid Mauritanian number")
    private String phone;
}
