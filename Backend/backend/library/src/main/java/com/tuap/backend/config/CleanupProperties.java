package com.tuap.backend.config;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties(prefix="app.cleanup") public class CleanupProperties {
 private boolean enabled=true; private String cron="0 15 3 * * *"; private int refreshRetentionDays=30; private int passwordResetRetentionDays=7; private int emailChangeRetentionDays=7; private int orphanUploadGraceHours=24;
 public boolean isEnabled(){return enabled;} public void setEnabled(boolean v){enabled=v;} public String getCron(){return cron;} public void setCron(String v){cron=v;} public int getRefreshRetentionDays(){return refreshRetentionDays;} public void setRefreshRetentionDays(int v){refreshRetentionDays=v;} public int getPasswordResetRetentionDays(){return passwordResetRetentionDays;} public void setPasswordResetRetentionDays(int v){passwordResetRetentionDays=v;} public int getEmailChangeRetentionDays(){return emailChangeRetentionDays;} public void setEmailChangeRetentionDays(int v){emailChangeRetentionDays=v;} public int getOrphanUploadGraceHours(){return orphanUploadGraceHours;} public void setOrphanUploadGraceHours(int v){orphanUploadGraceHours=v;}
}
