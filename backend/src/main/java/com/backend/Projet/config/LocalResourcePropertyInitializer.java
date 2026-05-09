package com.backend.Projet.config;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

/**
 * Fallback for IDE runs where resources are not copied into target/classes.
 * It loads local src/main/resources property files only when they exist.
 */
public class LocalResourcePropertyInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final String PROPERTY_SOURCE_PREFIX = "localResourceFallback:";

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        loadDotEnvFiles(environment);
        Path resourcesDirectory = Path.of("src", "main", "resources");

        if (!Files.isDirectory(resourcesDirectory)) {
            return;
        }

        loadIfExists(environment, resourcesDirectory.resolve("application.properties"), "application.properties");

        String[] profiles = resolveProfiles(environment, resourcesDirectory.resolve("application.properties"));
        for (String profile : profiles) {
            if (StringUtils.hasText(profile)) {
                loadIfExists(
                        environment,
                        resourcesDirectory.resolve("application-" + profile.trim() + ".properties"),
                        "application-" + profile.trim() + ".properties"
                );
            }
        }

        provideDevelopmentJwtSecretIfMissing(environment, profiles);
    }

    private void loadDotEnvFiles(ConfigurableEnvironment environment) {
        List<Path> candidatePaths = new ArrayList<>();
        candidatePaths.add(Path.of(".env"));
        candidatePaths.add(Path.of("..", ".env"));
        candidatePaths.add(Path.of("..", "Frontend", ".env"));
        candidatePaths.add(Path.of("..", "backend", ".env"));

        for (Path candidatePath : candidatePaths) {
            loadDotEnvIfExists(environment, candidatePath.normalize());
        }
    }

    private void loadDotEnvIfExists(ConfigurableEnvironment environment, Path filePath) {
        if (!Files.isRegularFile(filePath)) {
            return;
        }

        Properties properties = new Properties();
        try {
            for (String line : Files.readAllLines(filePath)) {
                String trimmedLine = line.trim();
                if (trimmedLine.isBlank() || trimmedLine.startsWith("#")) {
                    continue;
                }

                int separatorIndex = trimmedLine.indexOf('=');
                if (separatorIndex <= 0) {
                    continue;
                }

                String key = trimmedLine.substring(0, separatorIndex).trim();
                String value = trimmedLine.substring(separatorIndex + 1).trim();

                if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }

                if (!key.isBlank()) {
                    properties.setProperty(key, value);
                }
            }

            if (!properties.isEmpty()) {
                environment.getPropertySources().addLast(
                        new PropertiesPropertySource(PROPERTY_SOURCE_PREFIX + filePath.toString(), properties)
                );
            }
        } catch (IOException ignored) {
            // Ignore local .env loading failures and continue with normal Spring resolution.
        }
    }

    private void loadIfExists(ConfigurableEnvironment environment, Path filePath, String sourceName) {
        if (!Files.isRegularFile(filePath)) {
            return;
        }

        Properties properties = new Properties();
        try (InputStream inputStream = Files.newInputStream(filePath)) {
            properties.load(inputStream);
            environment.getPropertySources().addLast(
                    new PropertiesPropertySource(PROPERTY_SOURCE_PREFIX + sourceName, properties)
            );
        } catch (IOException ignored) {
            // Ignore local fallback loading failures and continue with normal Spring resolution.
        }
    }

    private String[] resolveProfiles(ConfigurableEnvironment environment, Path basePropertiesPath) {
        String configuredProfiles = environment.getProperty("spring.profiles.active");
        if (!StringUtils.hasText(configuredProfiles)) {
            configuredProfiles = System.getenv("SPRING_PROFILES_ACTIVE");
        }

        if (!StringUtils.hasText(configuredProfiles) && Files.isRegularFile(basePropertiesPath)) {
            configuredProfiles = extractProfileDefault(basePropertiesPath);
        }

        if (!StringUtils.hasText(configuredProfiles)) {
            configuredProfiles = "dev";
        }

        return Arrays.stream(configuredProfiles.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toArray(String[]::new);
    }

    private String extractProfileDefault(Path basePropertiesPath) {
        Properties properties = new Properties();
        try (InputStream inputStream = Files.newInputStream(basePropertiesPath)) {
            properties.load(inputStream);
        } catch (IOException ignored) {
            return "dev";
        }

        String profileValue = properties.getProperty("spring.profiles.active");
        if (!StringUtils.hasText(profileValue)) {
            return "dev";
        }

        int defaultSeparator = profileValue.indexOf(':');
        int endBrace = profileValue.lastIndexOf('}');
        if (defaultSeparator >= 0 && endBrace > defaultSeparator) {
            return profileValue.substring(defaultSeparator + 1, endBrace).trim();
        }

        return profileValue.trim();
    }

    private void provideDevelopmentJwtSecretIfMissing(ConfigurableEnvironment environment, String[] profiles) {
        boolean devProfileActive = Arrays.stream(profiles)
                .map(String::trim)
                .anyMatch("dev"::equalsIgnoreCase);

        if (!devProfileActive) {
            return;
        }

        if (StringUtils.hasText(environment.getProperty("security.jwt.secret-key"))
                || StringUtils.hasText(System.getenv("JWT_SECRET_KEY"))) {
            return;
        }

        Properties properties = new Properties();
        String generatedSecret = Base64.getEncoder()
                .encodeToString(UUID.randomUUID().toString().repeat(2).getBytes());
        properties.setProperty("security.jwt.secret-key", generatedSecret);
        environment.getPropertySources().addFirst(
                new PropertiesPropertySource(PROPERTY_SOURCE_PREFIX + "generated-dev-jwt", properties)
        );
    }
}
