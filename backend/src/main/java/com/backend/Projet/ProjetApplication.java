package com.backend.Projet;

import com.backend.Projet.config.LocalResourcePropertyInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@SpringBootApplication
@EnableScheduling
@EnableSpringDataWebSupport(
		pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO
)
public class ProjetApplication {
	public static void main(String[] args) {
		ensureDevelopmentJwtSecret();
		SpringApplication application = new SpringApplication(ProjetApplication.class);
		application.addInitializers(new LocalResourcePropertyInitializer());
		application.run(args);
	}

	private static void ensureDevelopmentJwtSecret() {
		String configuredSecret = System.getProperty("JWT_SECRET_KEY");
		if (configuredSecret == null || configuredSecret.isBlank()) {
			configuredSecret = System.getenv("JWT_SECRET_KEY");
		}

		if (configuredSecret != null && !configuredSecret.isBlank()) {
			return;
		}

		String activeProfile = System.getProperty("spring.profiles.active");
		if (activeProfile == null || activeProfile.isBlank()) {
			activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
		}

		boolean developmentProfile = activeProfile == null || activeProfile.isBlank() || activeProfile.contains("dev");
		if (!developmentProfile) {
			throw new IllegalStateException("JWT_SECRET_KEY must be configured for non-development profiles");
		}

		String generatedSecret = Base64.getEncoder().encodeToString(
				UUID.randomUUID().toString().repeat(2).getBytes(StandardCharsets.UTF_8)
		);
		System.setProperty("JWT_SECRET_KEY", generatedSecret);
	}
}
