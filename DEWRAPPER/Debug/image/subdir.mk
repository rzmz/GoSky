################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../image/image_opener.c \
../image/image_saver.c 

OBJS += \
./image/image_opener.o \
./image/image_saver.o 

C_DEPS += \
./image/image_opener.d \
./image/image_saver.d 


# Each subdirectory must supply rules for building sources it contributes
image/%.o: ../image/%.c
	@echo 'Building file: $<'
	@echo 'Invoking: Cross GCC Compiler'
	gcc -I"C:\Documents and Settings\xp\git\TVP360Server\DEWRAPPER\image" -I"C:\Documents and Settings\xp\git\TVP360Server\DEWRAPPER\LOGER" -I"C:\Documents and Settings\xp\git\TVP360Server\DEWRAPPER\image\libbmp" -I"C:\Documents and Settings\xp\git\TVP360Server\DEWRAPPER\image\libjpg" -I"C:\Documents and Settings\xp\git\TVP360Server\DEWRAPPER\mapper" -O0 -g3 -Wall -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


