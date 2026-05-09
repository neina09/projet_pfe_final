package com.backend.Projet.controller;

import com.backend.Projet.dto.RatingRequestDto;
import com.backend.Projet.dto.RatingResponseDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    @PostMapping("/booking/{bookingId}")
    public ResponseEntity<RatingResponseDto> rate(
            @PathVariable Long bookingId,
            @Valid @RequestBody RatingRequestDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ratingService.addRating(bookingId, input, currentUser));
    }

    @PostMapping("/task/{taskId}")
    public ResponseEntity<RatingResponseDto> rateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody RatingRequestDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ratingService.addTaskRating(taskId, input, currentUser));
    }

    @GetMapping("/worker/{workerId}")
    public ResponseEntity<List<RatingResponseDto>> getWorkerRatings(
            @PathVariable Long workerId) {
        return ResponseEntity.ok(ratingService.getWorkerRatings(workerId));
    }
}
