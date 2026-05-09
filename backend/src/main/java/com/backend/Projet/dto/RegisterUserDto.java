package com.backend.Projet.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterUserDto {

    @NotBlank(message = "Username is required")
    @Pattern(regexp = "^[\\p{L} ]{1,15}$", message = "Username must contain letters only and be at most 15 characters")
    private String username;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^(\\+222|222)?[2-4][0-9]{7}$", message = "Phone must be a valid Mauritanian number")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 64, message = "Password must be between 8 and 64 characters")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,64}$", message = "Password must contain at least one letter and one digit")
    private String password;
}
