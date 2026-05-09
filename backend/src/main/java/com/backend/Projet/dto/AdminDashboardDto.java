package com.backend.Projet.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminDashboardDto {
    private long totalUsers;
    private long verifiedUsers;
    private long totalWorkers;
    private long verifiedWorkers;
    private long pendingWorkers;
    private long pendingTasks;
    private long openTasks;
    private long inProgressTasks;
    private long completedTasks;
    private long pendingBookings;
    private long acceptedBookings;
    private long completedBookings;
    private long totalNotifications;
    private List<WorkerResponseDto> latestPendingWorkers;
    private List<TaskResponseDto> latestPendingTasks;
}
