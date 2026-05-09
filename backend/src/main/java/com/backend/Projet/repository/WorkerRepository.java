// WorkerRepository.java
package com.backend.Projet.repository;

import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.WorkerVerificationStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface WorkerRepository extends JpaRepository<Worker, Long> {
    @EntityGraph(attributePaths = {"user"})
    Optional<Worker> findByUserId(Long userId);

    Optional<Worker> findByPhoneNumber(String phoneNumber);
    Optional<Worker> findByNationalIdNumber(String nationalIdNumber);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findByAddress(String address);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findByJob(String job);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findByAvailability(WorkerAvailability availability);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findByVerificationStatus(WorkerVerificationStatus verificationStatus);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findByAvailabilityAndVerificationStatus(WorkerAvailability availability, WorkerVerificationStatus verificationStatus);

    @EntityGraph(attributePaths = {"user"})
    Page<Worker>     findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Page<Worker>     findByJob(String job, Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Page<Worker>     findByVerificationStatus(WorkerVerificationStatus verificationStatus, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"user"})
    List<Worker> findAll(Sort sort);

    long             countByVerificationStatus(WorkerVerificationStatus verificationStatus);

    @EntityGraph(attributePaths = {"user"})
    List<Worker>     findTop5ByVerificationStatusOrderByIdDesc(WorkerVerificationStatus verificationStatus);

    @Override
    @EntityGraph(attributePaths = {"user"})
    Optional<Worker> findById(Long id);

    @Modifying
    void deleteByUserId(Long userId);
}
