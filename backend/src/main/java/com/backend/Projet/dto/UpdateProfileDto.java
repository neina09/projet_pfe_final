package com.backend.Projet.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileDto {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Pattern(regexp = "^(\\+222|222)?[2-4][0-9]{7}$", message = "Phone must be a valid Mauritanian number")
    private String phone;
}
