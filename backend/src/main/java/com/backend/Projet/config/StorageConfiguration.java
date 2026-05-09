package com.backend.Projet.config;

import com.backend.Projet.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
@RequiredArgsConstructor
public class StorageConfiguration implements WebMvcConfigurer {

    private final FileStorageService fileStorageService;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadRoot = fileStorageService.getUploadRoot();
        if (uploadRoot == null) {
            return;
        }

        registry.addResourceHandler("/uploads/users/images/**")
                .addResourceLocations(uploadRoot.resolve("users/images").toUri().toString() + "/");

        registry.addResourceHandler("/uploads/workers/images/**")
                .addResourceLocations(uploadRoot.resolve("workers/images").toUri().toString() + "/");
    }
}
