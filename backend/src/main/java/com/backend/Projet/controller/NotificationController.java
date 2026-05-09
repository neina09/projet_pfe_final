package com.backend.Projet.controller;

import com.backend.Projet.dto.NotificationResponseDto;
import com.backend.Projet.dto.NotificationUnreadCountDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponseDto>> getMyNotifications(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(notificationService.getMyNotifications(currentUser));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<NotificationUnreadCountDto> getUnreadCount(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(notificationService.getUnreadCount(currentUser));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<String> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAsRead(id, currentUser);
        return ResponseEntity.ok("Notification marked as read");
    }

    @PatchMapping("/read-all")
    public ResponseEntity<String> markAllAsRead(
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok("All notifications marked as read");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        notificationService.deleteNotification(id, currentUser);
        return ResponseEntity.ok("Notification deleted");
    }

    @DeleteMapping("/all")
    public ResponseEntity<String> deleteAllNotifications(
            @AuthenticationPrincipal User currentUser) {
        notificationService.deleteAllNotifications(currentUser);
        return ResponseEntity.ok("All notifications deleted");
    }
}
