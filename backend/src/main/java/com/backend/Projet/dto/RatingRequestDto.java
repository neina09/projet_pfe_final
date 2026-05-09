package com.backend.Projet.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingRequestDto {

    @Min(value = 1, message = "Stars must be between 1 and 5")
    @Max(value = 5, message = "Stars must be between 1 and 5")
    private int stars;

    @Size(max = 500, message = "Comment must be less than 500 characters")
    private String comment;
}
