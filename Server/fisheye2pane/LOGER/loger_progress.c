#include <stdio.h>
#include "loger.h"


static t_log progress_log;


void init_progress_log(char *fname){
	open_log(fname, &progress_log);
	return;
	}

void write_progress_log(char *msg){
	//printf("%s\n",msg);
	write_log(msg, &progress_log);
	return;
	}

void close_progress_log(void){
	close_log(&progress_log);
	return;
	}
