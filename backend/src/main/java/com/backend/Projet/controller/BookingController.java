package com.backend.Projet.controller;

import com.backend.Projet.dto.BookingRequestDto;
import com.backend.Projet.dto.BookingResponseDto;
import com.backend.Projet.dto.BookingUpdateDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponseDto> createBooking(
            @Valid @RequestBody BookingRequestDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.createBooking(input, currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookingResponseDto> updateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingUpdateDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.updateBooking(id, input, currentUser));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<List<BookingResponseDto>> getMyBookings(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.getMyBookings(currentUser));
    }

    @GetMapping("/my-bookings/paged")
    public ResponseEntity<Page<BookingResponseDto>> getMyBookingsPaged(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookingService.getMyBookingsPaged(currentUser, page, size));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<BookingResponseDto>> getMyRequests(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.getMyRequests(currentUser));
    }

    @GetMapping("/my-requests/paged")
    public ResponseEntity<Page<BookingResponseDto>> getMyRequestsPaged(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(bookingService.getMyRequestsPaged(currentUser, page, size));
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<BookingResponseDto> acceptBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.acceptBooking(id, currentUser));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<BookingResponseDto> rejectBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.rejectBooking(id, currentUser));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<BookingResponseDto> completeBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.completeBooking(id, currentUser));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        bookingService.deleteBooking(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}