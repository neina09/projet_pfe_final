package com.backend.Projet.mapper;

import com.backend.Projet.dto.UserResponseDto;
import com.backend.Projet.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponseDto toDto(User user) {
        if (user == null) {
            return null;
        }
        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getName())
                .phone(user.getPhone())
                .role(user.getRole() == null ? null : user.getRole().toString())
                .imageUrl(user.getImageUrl())
                .build();
    }
}
