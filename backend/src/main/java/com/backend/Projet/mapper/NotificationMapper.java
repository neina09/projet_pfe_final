package com.backend.Projet.mapper;

import com.backend.Projet.dto.NotificationResponseDto;
import com.backend.Projet.model.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationResponseDto toDto(Notification notification) {
        if (notification == null) {
            return null;
        }
        return NotificationResponseDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
