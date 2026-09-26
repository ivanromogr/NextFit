package com.tuap.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "upload")
public class UploadProperties {
    private String storageDirectory = "uploads";
    private long profileImageMaxBytes = 5L * 1024 * 1024;
    private long chatAttachmentMaxBytes = 10L * 1024 * 1024;

    public String getStorageDirectory() { return storageDirectory; }
    public void setStorageDirectory(String storageDirectory) { this.storageDirectory = storageDirectory; }
    public long getProfileImageMaxBytes() { return profileImageMaxBytes; }
    public void setProfileImageMaxBytes(long profileImageMaxBytes) { this.profileImageMaxBytes = profileImageMaxBytes; }
    public long getChatAttachmentMaxBytes() { return chatAttachmentMaxBytes; }
    public void setChatAttachmentMaxBytes(long chatAttachmentMaxBytes) { this.chatAttachmentMaxBytes = chatAttachmentMaxBytes; }
}
