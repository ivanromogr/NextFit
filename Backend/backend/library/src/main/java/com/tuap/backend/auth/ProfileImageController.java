package com.tuap.backend.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.servicios.ProfileImageService;

@RestController
@RequestMapping("/api/auth/profile-image")
public class ProfileImageController {
    private final ProfileImageService profileImages;
    public ProfileImageController(ProfileImageService profileImages) { this.profileImages = profileImages; }

    @PutMapping
    public ResponseEntity<Map<String, String>> assign(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody Map<String, UUID> body) {
        UUID fileId = body.get("fileId");
        if (fileId == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(Map.of("fotoPerfil", profileImages.assign(user, fileId)));
    }

    @DeleteMapping
    public ResponseEntity<Void> remove(@AuthenticationPrincipal AuthenticatedUser user) {
        profileImages.remove(user);
        return ResponseEntity.noContent().build();
    }
}
