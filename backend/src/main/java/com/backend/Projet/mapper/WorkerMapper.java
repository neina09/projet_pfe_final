package com.backend.Projet.mapper;

import com.backend.Projet.dto.WorkerResponseDto;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerVerificationStatus;
import org.springframework.stereotype.Component;

@Component
public class WorkerMapper {

    public WorkerResponseDto toDto(Worker worker) {
        return toDto(worker, false);
    }

    public WorkerResponseDto toDto(Worker worker, boolean includeSensitiveDetails) {
        if (worker == null) {
            return null;
        }

        String resolvedImageUrl = worker.getImageUrl();
        if ((resolvedImageUrl == null || resolvedImageUrl.isBlank())
                && worker.getUser() != null
                && worker.getUser().getImageUrl() != null
                && !worker.getUser().getImageUrl().isBlank()) {
            resolvedImageUrl = worker.getUser().getImageUrl();
        }

        String identityDocumentUrl = includeSensitiveDetails ? worker.getIdentityDocumentUrl() : null;
        String nationalIdNumber = includeSensitiveDetails ? worker.getNationalIdNumber() : null;
        String verificationNotes = includeSensitiveDetails ? worker.getVerificationNotes() : null;
        String userPhone = includeSensitiveDetails && worker.getUser() != null
                ? worker.getUser().getPhone()
                : null;

        return WorkerResponseDto.builder()
                .id(worker.getId())
                .name(worker.getName())
                .job(worker.getJob())
                .address(worker.getAddress())
                .bio(worker.getBio())
                .salary(worker.getSalary())
                .imageUrl(resolvedImageUrl)
                .identityDocumentUrl(identityDocumentUrl)
                .nationalIdNumber(nationalIdNumber)
                .phoneNumber(worker.getPhoneNumber())
                .availability(worker.getAvailability())
                .averageRating(worker.getAverageRating())
                .verificationStatus(worker.getVerificationStatus())
                .verificationNotes(verificationNotes)
                .userId(worker.getUser() != null ? worker.getUser().getId() : null)
                .username(worker.getUser() != null ? worker.getUser().getUsername() : null)
                .userPhone(userPhone)
                .verified(worker.getVerificationStatus() == WorkerVerificationStatus.VERIFIED)
                .build();
    }
}
