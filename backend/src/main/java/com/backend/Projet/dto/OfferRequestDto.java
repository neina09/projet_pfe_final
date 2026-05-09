package com.backend.Projet.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter
public class OfferRequestDto {

    @NotBlank(message = "Message is required")
    @Size(max = 500, message = "Message must not exceed 500 characters")
    private String message;

}
