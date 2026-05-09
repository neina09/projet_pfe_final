package com.backend.Projet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.security.public-docs-enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigurationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicTaskByIdShouldRemainAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isNotFound());
    }

    @Test
    void myTasksShouldNotBePublic() throws Exception {
        mockMvc.perform(get("/api/tasks/my-tasks"))
                .andExpect(status().isForbidden());
    }

    @Test
    void myWorkerProfileShouldNotBePublic() throws Exception {
        mockMvc.perform(get("/api/workers/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void adminPendingWorkersShouldRejectRegularUsers() throws Exception {
        mockMvc.perform(get("/api/workers/admin/pending"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminPendingWorkersShouldAllowAdmins() throws Exception {
        mockMvc.perform(get("/api/workers/admin/pending"))
                .andExpect(status().isOk());
    }

    @Test
    void apiDocsShouldBeAccessible() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk());
    }
}
