package com.backend.Projet.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.webmvc.ui.SwaggerIndexTransformer;
import org.springdoc.webmvc.ui.SwaggerResourceResolver;
import org.springdoc.webmvc.ui.SwaggerWebMvcConfigurer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Projet Backend API",
                version = "1.0",
                description = "REST API for authentication, workers, tasks, bookings, ratings, chat, and notifications.",
                contact = @Contact(name = "Projet Backend Team")
        )
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER
)
public class OpenApiConfiguration {

    @Bean
    SwaggerWebMvcConfigurer swaggerWebMvcConfigurer(
            SwaggerUiConfigProperties swaggerUiConfigProperties,
            WebProperties webProperties,
            WebMvcProperties webMvcProperties,
            SwaggerIndexTransformer swaggerIndexTransformer,
            SwaggerResourceResolver swaggerResourceResolver,
            SwaggerWelcomeCommon swaggerWelcomeCommon
    ) {
        return new SwaggerWebMvcConfigurer(
                swaggerUiConfigProperties,
                webProperties,
                webMvcProperties,
                swaggerIndexTransformer,
                swaggerResourceResolver,
                swaggerWelcomeCommon
        ) {
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                String swaggerUiLocation =
                        "classpath:/META-INF/resources/webjars/swagger-ui/" + swaggerUiConfigProperties.getVersion() + "/";

                addSwaggerResourceHandler(
                        registry,
                        SwaggerResourceHandlerConfig.createCached()
                                .setPatterns("/swagger-ui/**")
                                .setLocations(swaggerUiLocation)
                );

                addSwaggerResourceHandler(
                        registry,
                        SwaggerResourceHandlerConfig.createUncached()
                                .setPatterns("/swagger-ui/*swagger-initializer.js")
                                .setLocations(swaggerUiLocation)
                );
            }
        };
    }
}
