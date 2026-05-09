package com.backend.Projet.service;

import com.backend.Projet.dto.NotificationResponseDto;
import com.backend.Projet.dto.NotificationUnreadCountDto;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.model.Notification;
import com.backend.Projet.model.NotificationType;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.repository.NotificationRepository;
import com.backend.Projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final com.backend.Projet.mapper.NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void sendNotification(User target, String msg, NotificationType type) {
        if (target == null) {
            return;
        }

        Notification notification = Notification.builder()
                .user(target)
                .message(msg)
                .type(type)
                .build();
        Notification savedNotification = notificationRepository.save(notification);
        NotificationResponseDto notificationDto = notificationMapper.toDto(savedNotification);
        messagingTemplate.convertAndSend("/topic/notifications/" + target.getId(), notificationDto);
        pushUnreadCount(target.getId());
    }

    @Transactional
    public void sendNotificationToRole(Role role, String msg, NotificationType type) {
        userRepository.findByRole(role)
                .forEach(user -> sendNotification(user, msg, type));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getMyNotifications(User currentUser) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream().map(notificationMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public NotificationUnreadCountDto getUnreadCount(User currentUser) {
        return new NotificationUnreadCountDto(
                notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId())
        );
    }

    @Transactional
    public void markAsRead(Long notificationId, User currentUser) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        // FIX: كانت ResourceNotFoundException — الصح هو UnauthorizedException
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized to read this notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        pushUnreadCount(currentUser.getId());
    }

    @Transactional
    public void markAllAsRead(User currentUser) {
        notificationRepository.markAllAsReadByUserId(currentUser.getId());
        pushUnreadCount(currentUser.getId());
    }

    @Transactional
    public void deleteNotification(Long id, User currentUser) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized to delete this notification");
        }

        notificationRepository.delete(notification);
        pushUnreadCount(currentUser.getId());
    }

    @Transactional
    public void deleteAllNotifications(User currentUser) {
        notificationRepository.deleteByUserId(currentUser.getId());
        pushUnreadCount(currentUser.getId());
    }

    private void pushUnreadCount(Long userId) {
        NotificationUnreadCountDto unreadCountDto = new NotificationUnreadCountDto(
                notificationRepository.countByUserIdAndIsReadFalse(userId)
        );
        messagingTemplate.convertAndSend("/topic/notifications/" + userId + "/count", unreadCountDto);
    }
}
