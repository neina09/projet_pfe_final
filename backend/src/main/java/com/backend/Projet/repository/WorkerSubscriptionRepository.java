package com.backend.Projet.repository;

import com.backend.Projet.model.WorkerSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkerSubscriptionRepository extends JpaRepository<WorkerSubscription, Long> {
    Optional<WorkerSubscription> findByWorkerId(Long workerId);
    boolean existsByTransferReference(String transferReference);
}
