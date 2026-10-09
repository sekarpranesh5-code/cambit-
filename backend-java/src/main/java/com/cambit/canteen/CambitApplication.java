package com.cambit.canteen;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CambitApplication {
    public static void main(String[] args) {
        System.out.println("=======================================================");
        System.out.println("  Cambit Canteen Pre-Order System (Spring Boot Java)");
        System.out.println("  Local URL: http://localhost:8080");
        System.out.println("=======================================================");
        SpringApplication.run(CambitApplication.class, args);
    }
}
