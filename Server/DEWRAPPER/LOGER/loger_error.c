#include <stdio.h>
#include "loger.h"


static t_log error_log;


void init_error_log(char *fname){
	open_log(fname, &error_log);
	return;
	}

void write_error_log(char *msg){
	printf("err:%s", msg);	
	write_log(msg, &error_log);
	return;
	}

void close_error_log(void){
	close_log(&error_log);
	return;
	}
