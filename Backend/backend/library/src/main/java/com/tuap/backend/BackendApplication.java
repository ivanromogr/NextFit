package com.tuap.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import com.tuap.backend.config.CleanupProperties;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(CleanupProperties.class)
@ComponentScan(basePackages = "com.tuap.backend")
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
