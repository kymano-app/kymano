#define _CRT_SECURE_NO_WARNINGS

#include <stdio.h>
#include <stdlib.h>

#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <regex>
#include <string>

using namespace std;

char buf[1000];
string userName;
string getOsName() {
#if defined(_WIN32) || defined(_WIN64)
    return "windows";
#elif defined(_W__APPLE__IN32) || defined(__MACH__)
    return "macos";
#elif defined(__linux__)
    return "linux";
#else
    return "unknown";
#endif
}
const string singleslash("\\\\");

int main(int argc, char* argv[]) {
    string cmd = "";
    string resultCmd = "";
    string qemuPath = getenv("QEMU");
    string qemuL = getenv("QEMU_L");

    for (int i = 1; i < argc; i++) {
        string arg_name = argv[i];
        string arg_value;
        if (i + 1 < argc) {
            arg_value = argv[i + 1];
        }
        if (arg_name.at(0) != '-') {
            continue;
        }

        if (getOsName() == "windows") {
            if (arg_name == "-machine") {
                continue;
            }
        }
        if (arg_name == "-object") {
            continue;
        }
        if (arg_name == "-device" && arg_value == "virtio-rng-pci,rng=rng0") {
            continue;
        }

        cmd = cmd + arg_name + " ";
        if (i + 1 < argc) {
            if (arg_value.at(0) != '-') {
                cmd = cmd + "\"" + arg_value + "\" ";
            }
        }
    }

    if (getOsName() == "windows") {
        qemuPath = regex_replace(qemuPath, regex(singleslash.c_str()),
                                 singleslash.c_str());
        cmd = regex_replace(cmd, regex("/cygdrive/c/"), "c:\\");
        cmd = regex_replace(cmd, regex("/"), "\\");
        cmd = cmd + "-L " + qemuL;
        resultCmd = "\"\"" + qemuPath + "\" " + cmd + " 2>&1 \"";
    } else {
        resultCmd = "\"" + qemuPath + "\" " + cmd + " 2>&1 ";
    }

    printf("%s\n", resultCmd.c_str());
    ofstream MyFile("log.txt");
    MyFile << resultCmd;
    
    const char* cmd_ = resultCmd.c_str();
    FILE* output = popen(cmd_, "r");
    while (fgets(buf, 1000, output)) {
        MyFile << buf;
    }
    pclose(output);
    MyFile.close();
    return 0;

    // system(resultCmd.c_str());
}