# Dockerfile for TinyOS
FROM ubuntu:14.04
MAINTAINER Addisu Taddese <addisu@gmail.com>

# Setup Repo keys
RUN gpg --keyserver keyserver.ubuntu.com --recv-keys A9B913B9
RUN gpg -a --export A9B913B9 | sudo apt-key add -

# Add repo 
RUN echo "deb http://tinyprod.net/repos/debian squeeze main" > /etc/apt/sources.list.d/tinyprod-debian.list
RUN echo "deb http://tinyprod.net/repos/debian msp430-46 main" >> /etc/apt/sources.list.d/tinyprod-debian.list

# Install toolchain
RUN apt-get -qq update
RUN apt-get -qqy install nesc tinyos-tools msp430-46 avr-tinyos git build-essential zsh

RUN git clone https://github.com/pillforge/tinyos /root/tinyos

COPY tos-zshrc /root/.zshrc

