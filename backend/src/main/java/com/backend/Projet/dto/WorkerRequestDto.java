package com.backend.Projet.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkerRequestDto {

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(\\+222|222)?[2-4][0-9]{7}$", message = "Phone number must be a valid Mauritanian number")
    private String phoneNumber;

    @Size(max = 2048, message = "Image URL must not exceed 2048 characters")
    private String imageUrl;

    @NotBlank(message = "Job is required")
    @Size(max = 100, message = "Job must not exceed 100 characters")
    private String job;

    @NotBlank(message = "Name is required")
    @Pattern(regexp = "^[\\p{L} ]{1,15}$", message = "Name must contain letters only and be at most 15 characters")
    private String name;

    @NotBlank(message = "Address is required")
    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @Size(max = 1000, message = "Bio must not exceed 1000 characters")
    private String bio;



    @NotBlank(message = "National ID number is required")
    @Pattern(regexp = "^\\d{10}$", message = "National ID number must be exactly 10 digits (Mauritanian NNI)")
    private String nationalIdNumber;
}
