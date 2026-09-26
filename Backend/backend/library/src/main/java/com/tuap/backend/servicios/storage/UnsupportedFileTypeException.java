package com.tuap.backend.servicios.storage;

public class UnsupportedFileTypeException extends InvalidFileException {
    public UnsupportedFileTypeException(String message) { super(message); }
}
