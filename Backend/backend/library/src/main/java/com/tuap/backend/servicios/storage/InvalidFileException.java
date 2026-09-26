package com.tuap.backend.servicios.storage;

public class InvalidFileException extends RuntimeException {
    public InvalidFileException(String message) { super(message); }
    public InvalidFileException(String message, Throwable cause) { super(message, cause); }
}
