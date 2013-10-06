#include <stdio.h>
#include "loger.h"


static t_log error_log;


void init_error_log(char *fname){
	open_log(fname, &error_log);
	return;
	}

void write_error_log(char *msg){
	//printf("%s\n",msg);
	write_log(msg, &error_log);
	return;
	}
