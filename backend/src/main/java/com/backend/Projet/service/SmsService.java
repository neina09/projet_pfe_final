package com.backend.Projet.service;

import com.backend.Projet.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${app.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.sms.chinguisoft.validation-key:}")
    private String validationKey;

    @Value("${app.sms.chinguisoft.validation-token:}")
    private String validationToken;

    @Value("${app.sms.chinguisoft.lang:ar}")
    private String lang;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendVerificationCode(String phone, String code) {
        sendSms(phone, code);
    }

    public void sendPasswordResetToken(String phone, String token) {
        sendSms(phone, token);
    }

    private void sendSms(String phone, String code) {
        if (!smsEnabled) {
            log.warn("SMS delivery is disabled. No SMS was sent to {}", maskPhone(phone));
            return;
        }

        if (validationKey.isBlank() || validationToken.isBlank()) {
            log.error("SMS keys are not configured. Check validation-key and validation-token.");
            throw new BusinessException("SMS configuration is incomplete");
        }

        String url = "https://chinguisoft.com/api/sms/validation/" + validationKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Validation-token", validationToken);
        Map<String, String> body = Map.of(
                "phone", phone.replaceAll("\\D", ""),
                "lang", lang,
                "code", code
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("SMS sent to {}. Balance: {}", maskPhone(phone), response.getBody().get("balance"));
            } else {
                log.error("Chinguisoft SMS error: status={}, body={}", response.getStatusCode(), response.getBody());
                throw new BusinessException("Failed to send SMS");
            }

        } catch (BusinessException ex) {
            throw ex;
        } catch (HttpStatusCodeException ex) {
            log.error(
                    "Chinguisoft HTTP error for {}: status={}, body={}",
                    maskPhone(phone),
                    ex.getStatusCode(),
                    ex.getResponseBodyAsString(),
                    ex
            );
            throw new BusinessException("Failed to send SMS");
        } catch (Exception ex) {
            log.error("Unexpected SMS error for {}: {}", maskPhone(phone), ex.getMessage(), ex);
            throw new BusinessException("Failed to send SMS");
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "unknown";
        }
        if (phone.length() <= 4) {
            return "****";
        }
        return "*".repeat(Math.max(0, phone.length() - 4)) + phone.substring(phone.length() - 4);
    }
}
