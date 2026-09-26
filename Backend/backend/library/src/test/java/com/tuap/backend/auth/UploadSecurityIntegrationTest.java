package com.tuap.backend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UploadSecurityIntegrationTest {
    @Autowired private MockMvc mockMvc;

    @Test void uploadWithoutJwt_IsUnauthorized() throws Exception {
        mockMvc.perform(multipart("/api/upload")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff}))
                        .param("purpose", "PROFILE_IMAGE"))
                .andExpect(status().isUnauthorized());
    }
}
