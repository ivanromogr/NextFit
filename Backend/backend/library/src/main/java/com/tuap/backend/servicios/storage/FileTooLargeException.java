package com.tuap.backend.servicios.storage;

public class FileTooLargeException extends InvalidFileException {
    public FileTooLargeException(String message) { super(message); }
}
